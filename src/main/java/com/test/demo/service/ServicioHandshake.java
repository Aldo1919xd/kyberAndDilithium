package com.test.demo.service;

import jakarta.annotation.PostConstruct;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.generators.HKDFBytesGenerator;
import org.bouncycastle.crypto.params.HKDFParameters;
import org.bouncycastle.crypto.digests.SHA256Digest;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPublicKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberKEMExtractor;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPublicKeyParameters;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ServicioHandshake {

    private static final long TTL_SESION = 300;
    private static final long TTL_HANDSHAKE = 30;

    private final ServicioFirmaDilithium servicioFirma;
    private final ServicioCifradoKyber servicioCifrado;
    private final SecureRandom aleatorioSeguro = new SecureRandom();

    private DilithiumPublicKeyParameters pkSig;
    private DilithiumPrivateKeyParameters skSig;

    private final ConcurrentHashMap<String, HandshakePendiente> pendientes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, InfoSesion> sesiones = new ConcurrentHashMap<>();

    public ServicioHandshake(ServicioFirmaDilithium servicioFirma, ServicioCifradoKyber servicioCifrado) {
        this.servicioFirma = servicioFirma;
        this.servicioCifrado = servicioCifrado;
    }

    @PostConstruct
    public void init() {
        AsymmetricCipherKeyPair par = servicioFirma.generarParLlaves();
        pkSig = (DilithiumPublicKeyParameters) par.getPublic();
        skSig = (DilithiumPrivateKeyParameters) par.getPrivate();
    }

    public Map<String, Object> iniciarHandshake() {
        AsymmetricCipherKeyPair kp = servicioCifrado.generarParLlaves();
        KyberPublicKeyParameters pkKem = (KyberPublicKeyParameters) kp.getPublic();
        KyberPrivateKeyParameters skKem = (KyberPrivateKeyParameters) kp.getPrivate();

        String handshakeId = UUID.randomUUID().toString();
        byte[] serverNonce = new byte[16];
        aleatorioSeguro.nextBytes(serverNonce);

        byte[] pkKemBytes = pkKem.getEncoded();
        byte[] datosAFirmar = concatenar(serverNonce, pkKemBytes, handshakeId.getBytes(StandardCharsets.UTF_8));
        byte[] firma = servicioFirma.firmar(datosAFirmar, skSig, aleatorioSeguro);

        pendientes.put(handshakeId, new HandshakePendiente(skKem, serverNonce, Instant.now()));

        return Map.of(
            "handshake_id", handshakeId,
            "pk_sig", Hex.toHexString(pkSig.getEncoded()),
            "pk_kem", Hex.toHexString(pkKemBytes),
            "firma", Hex.toHexString(firma),
            "server_nonce", Hex.toHexString(serverNonce)
        );
    }

    public Map<String, Object> finalizarHandshake(String handshakeId, byte[] ct, byte[] clientNonce) {
        HandshakePendiente pendiente = pendientes.remove(handshakeId);
        if (pendiente == null || pendiente.estaExpirada()) {
            throw new IllegalArgumentException("Handshake expirado o invalido");
        }

        KyberKEMExtractor extractor = new KyberKEMExtractor(pendiente.skKem());
        byte[] sharedSecret = extractor.extractSecret(ct);

        byte[] salt = concatenar(pendiente.serverNonce(), clientNonce);
        byte[] sessionKey = derivarClave(sharedSecret, salt);

        String sessionId = UUID.randomUUID().toString();
        sesiones.put(sessionId, new InfoSesion(sessionKey));

        return Map.of("sessionId", sessionId);
    }

    public InfoSesion validarSesion(String sessionId) {
        while (true) {
            InfoSesion sesion = sesiones.get(sessionId);
            if (sesion == null) throw new IllegalArgumentException("Sesion invalida");
            if (sesion.estaExpirada(TTL_SESION)) {
                sesiones.remove(sessionId);
                throw new IllegalArgumentException("Sesion expirada");
            }
            InfoSesion renovada = sesion.renovar();
            if (sesiones.replace(sessionId, sesion, renovada)) {
                return renovada;
            }
        }
    }

    public byte[] descifrarBody(byte[] sessionKey, byte[] iv, byte[] datosCifrados) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(sessionKey, "AES"), new GCMParameterSpec(128, iv));
        return c.doFinal(datosCifrados);
    }

    public byte[] cifrarBody(byte[] sessionKey, byte[] iv, byte[] datos) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(sessionKey, "AES"), new GCMParameterSpec(128, iv));
        return c.doFinal(datos);
    }

    private byte[] derivarClave(byte[] sharedSecret, byte[] salt) {
        HKDFBytesGenerator hkdf = new HKDFBytesGenerator(new SHA256Digest());
        hkdf.init(new HKDFParameters(sharedSecret, salt, "PQC-Handshake-v1".getBytes(StandardCharsets.UTF_8)));
        byte[] key = new byte[32];
        hkdf.generateBytes(key, 0, 32);
        return key;
    }

    private static byte[] concatenar(byte[] a, byte[] b, byte[] c) {
        byte[] r = new byte[a.length + b.length + c.length];
        System.arraycopy(a, 0, r, 0, a.length);
        System.arraycopy(b, 0, r, a.length, b.length);
        System.arraycopy(c, 0, r, a.length + b.length, c.length);
        return r;
    }

    private static byte[] concatenar(byte[] a, byte[] b) {
        byte[] r = new byte[a.length + b.length];
        System.arraycopy(a, 0, r, 0, a.length);
        System.arraycopy(b, 0, r, a.length, b.length);
        return r;
    }

    @Scheduled(fixedRate = 60000)
    public void limpiarSesiones() {
        sesiones.values().removeIf(s -> s.estaExpirada(TTL_SESION));
        pendientes.values().removeIf(HandshakePendiente::estaExpirada);
    }

    // --- inner records ---

    public record InfoSesion(byte[] sessionKey, Instant creadaEn, Instant ultimoUso) {
        InfoSesion(byte[] sessionKey) { this(sessionKey, Instant.now(), Instant.now()); }
        InfoSesion renovar() { return new InfoSesion(sessionKey, creadaEn, Instant.now()); }
        boolean estaExpirada(long ttl) { return Instant.now().isAfter(ultimoUso.plusSeconds(ttl)); }
    }

    record HandshakePendiente(KyberPrivateKeyParameters skKem, byte[] serverNonce, Instant creadaEn) {
        boolean estaExpirada() { return Instant.now().isAfter(creadaEn.plusSeconds(30)); }
    }
}
