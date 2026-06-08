package com.test.demo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.test.demo.model.InfoSesion;
import com.test.demo.service.ServicioHandshake;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Map;

@Component
@Order(1)
public class FiltroSesionPQC extends OncePerRequestFilter {

    private final ServicioHandshake servicioHandshake;
    private final ObjectMapper mapper = new ObjectMapper();
    private final SecureRandom aleatorio = new SecureRandom();

    public FiltroSesionPQC(ServicioHandshake servicioHandshake) {
        this.servicioHandshake = servicioHandshake;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/api/handshake/init") || path.equals("/api/handshake/finalizar");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException {

        String sessionId = request.getHeader("X-Session-ID");
        if (sessionId == null || sessionId.isEmpty()) {
            chain(request, response, chain);
            return;
        }

        InfoSesion sesion;
        try {
            sesion = servicioHandshake.validarSesion(sessionId);
        } catch (Exception e) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"exito\":false,\"error\":\"Sesion invalida\"}");
            return;
        }

        try {
            byte[] bodyBytes = request.getInputStream().readAllBytes();
            HttpServletRequest wrapped = request;

            if (bodyBytes.length > 0) {
                String bodyStr = new String(bodyBytes, StandardCharsets.UTF_8);
                @SuppressWarnings("unchecked")
                Map<String, Object> bodyMap = mapper.readValue(bodyStr, Map.class);

                byte[] iv = Hex.decodeStrict((String) bodyMap.get("iv"));
                byte[] datosCifrados = Hex.decodeStrict((String) bodyMap.get("datos_cifrados"));

                Cipher cifrador = Cipher.getInstance("AES/GCM/NoPadding");
                cifrador.init(Cipher.DECRYPT_MODE,
                    new SecretKeySpec(sesion.sessionKey(), "AES"),
                    new GCMParameterSpec(128, iv));
                byte[] plaintext = cifrador.doFinal(datosCifrados);

                wrapped = new CachedBodyRequest(request, plaintext);
            }

            ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);
            chain.doFilter(wrapped, responseWrapper);

            byte[] respBody = responseWrapper.getContentAsByteArray();
            if (respBody.length > 0) {
                byte[] respIv = new byte[12];
                aleatorio.nextBytes(respIv);

                Cipher cifradorResp = Cipher.getInstance("AES/GCM/NoPadding");
                cifradorResp.init(Cipher.ENCRYPT_MODE,
                    new SecretKeySpec(sesion.sessionKey(), "AES"),
                    new GCMParameterSpec(128, respIv));
                byte[] cifrado = cifradorResp.doFinal(respBody);

                String json = mapper.writeValueAsString(Map.of(
                    "iv", Hex.toHexString(respIv),
                    "datos_cifrados", Hex.toHexString(cifrado)
                ));

                response.setContentType("application/json");
                byte[] jsonBytes = json.getBytes(StandardCharsets.UTF_8);
                response.setContentLength(jsonBytes.length);
                response.getOutputStream().write(jsonBytes);
            }
        } catch (Exception e) {
            response.setStatus(500);
            response.setContentType("application/json");
            response.getWriter().write("{\"exito\":false,\"error\":\"Error de cifrado: " + e.getMessage() + "\"}");
        }
    }

    private void chain(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException {
        try {
            chain.doFilter(request, response);
        } catch (Exception e) {
            throw new IOException(e);
        }
    }

    private static class CachedBodyRequest extends HttpServletRequestWrapper {
        private final byte[] body;

        CachedBodyRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            return new ServletInputStream() {
                private final InputStream in = new ByteArrayInputStream(body);

                @Override public int read() throws IOException { return in.read(); }
                @Override public boolean isFinished() { return false; }
                @Override public boolean isReady() { return true; }
                @Override public void setReadListener(ReadListener listener) {}
            };
        }

        @Override
        public java.io.BufferedReader getReader() {
            return new java.io.BufferedReader(new java.io.InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
