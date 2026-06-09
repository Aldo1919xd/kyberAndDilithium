package com.test.demo.controller;

import com.test.demo.model.DatosCertificado;
import com.test.demo.model.RandomSemillaFija;
import com.test.demo.service.ServicioHandshake;
import com.test.demo.service.ServicioSimulacion;
import com.test.demo.service.ServicioUniversidad;
import org.bouncycastle.util.encoders.Hex;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ControladorApi {

    private static final Logger log = LoggerFactory.getLogger(ControladorApi.class);

    private final ServicioUniversidad servicioUniversidad;
    private final ServicioSimulacion servicioSimulacion;
    private final ServicioHandshake servicioHandshake;

    public ControladorApi(ServicioUniversidad servicioUniversidad, ServicioSimulacion servicioSimulacion, ServicioHandshake servicioHandshake) {
        this.servicioUniversidad = servicioUniversidad;
        this.servicioSimulacion = servicioSimulacion;
        this.servicioHandshake = servicioHandshake;
    }

    // ===== Handshake =====
    @PostMapping("/handshake/init")
    public Map<String, Object> iniciarHandshake() {
        return servicioHandshake.iniciarHandshake();
    }

    @PostMapping("/handshake/finalizar")
    public Map<String, Object> finalizarHandshake(@RequestBody Map<String, Object> body) {
        String handshakeId = (String) body.get("handshake_id");
        byte[] ct = Hex.decodeStrict((String) body.get("ct"));
        byte[] clientNonce = Hex.decodeStrict((String) body.get("client_nonce"));
        try {
            return servicioHandshake.finalizarHandshake(handshakeId, ct, clientNonce);
        } catch (IllegalArgumentException e) {
            return Map.of("exito", false, "error", e.getMessage());
        }
    }

    // ===== Estudiantes =====
    @PostMapping("/estudiante/crear")
    public Map<String, Object> crearEstudiante(@RequestBody Map<String, String> cuerpo) {
        String nombre = cuerpo.get("nombre");
        if (nombre == null || nombre.isBlank()) {
            return Map.of("exito", false, "error", "El nombre es obligatorio");
        }
        servicioUniversidad.crearEstudiante(nombre);
        return Map.of("exito", true, "nombre", nombre);
    }

    @GetMapping("/estudiantes")
    public Map<String, Object> obtenerEstudiantes() {
        return Map.of("estudiantes", servicioUniversidad.obtenerNombresEstudiantes());
    }

    @PostMapping("/certificado/emitir")
    public Map<String, Object> firmarCertificado(@RequestBody DatosCertificado cert) throws Exception {
        Map<String, Object> emitido = servicioUniversidad.firmarCertificado(cert);
        String llavePublica = servicioUniversidad.estaInicializada()
            ? Hex.toHexString(servicioUniversidad.obtenerLlavePublicaUniversidad()) : "";
        return Map.of("exito", true, "certificado", emitido, "llavePublicaUniversidad", llavePublica);
    }

    @GetMapping("/certificados")
    public Map<String, Object> listarCertificados() {
        return Map.of("certificados", servicioUniversidad.obtenerTodosCertificados());
    }

    @PostMapping("/certificados/entregar")
    public Map<String, Object> entregarCertificado(@RequestBody Map<String, String> cuerpo) throws Exception {
        String idCertificado = cuerpo.get("idCertificado");
        String nombreEstudiante = cuerpo.get("nombreEstudiante");
        if (idCertificado == null || nombreEstudiante == null) {
            return Map.of("exito", false, "error", "Faltan parámetros");
        }
        try {
            Map<String, Object> entregado = servicioUniversidad.entregarCertificado(idCertificado, nombreEstudiante);
            String llavePublicaEstudiante = servicioUniversidad.obtenerLlavePublicaEstudianteHex(nombreEstudiante);
            return Map.of("exito", true, "entrega", entregado, "llavePublicaEstudiante", llavePublicaEstudiante);
        } catch (IllegalArgumentException e) {
            return Map.of("exito", false, "error", e.getMessage());
        }
    }

    @GetMapping("/certificados/bandeja/{nombre}")
    public Map<String, Object> obtenerBandeja(@PathVariable String nombre) {
        return Map.of("bandeja", servicioUniversidad.obtenerBandeja(nombre));
    }

    @PostMapping("/certificados/recibir")
    public Map<String, Object> recibirCertificado(@RequestBody Map<String, String> cuerpo) throws Exception {
        String idCertificado = cuerpo.get("idCertificado");
        String nombreEstudiante = cuerpo.get("nombreEstudiante");
        if (idCertificado == null || nombreEstudiante == null) {
            return Map.of("exito", false, "error", "Faltan parámetros");
        }
        try {
            Map<String, Object> resultado = servicioUniversidad.recibirDeBandeja(idCertificado, nombreEstudiante);
            resultado.put("exito", true);
            resultado.put("llavePublicaUniversidad", servicioUniversidad.estaInicializada()
                ? Hex.toHexString(servicioUniversidad.obtenerLlavePublicaUniversidad()) : "");
            return resultado;
        } catch (IllegalArgumentException e) {
            return Map.of("exito", false, "error", e.getMessage());
        } catch (Exception e) {
            log.error("Error al recibir certificado {} para {}", idCertificado, nombreEstudiante, e);
            return Map.of(
                "exito", false,
                "error", "No se pudo descifrar este certificado con la identidad seleccionada."
            );
        }
    }

    // ===================== LABORATORIOS =====================

    // ===== LABORATORIO 1: RNG Débil =====
    @PostMapping("/laboratorios/1/activar-rng-debil")
    public Map<String, Object> activarRngDebil(@RequestBody Map<String, Boolean> body) {
        boolean activo = body.getOrDefault("activo", true);
        servicioSimulacion.activarRngDebil(activo);
        if (activo) {
            RandomSemillaFija rs = servicioSimulacion.obtenerRandomSemillaFija();
            servicioUniversidad.reinicializarConRandom(rs);
        }
        return Map.of("exito", true, "entropiaPredecible", activo);
    }

    @GetMapping("/laboratorios/1/estado")
    public Map<String, Object> estadoLaboratorio1() {
        return Map.of("entropiaPredecible", servicioSimulacion.estaRngDebilActivo());
    }

    @PostMapping("/laboratorios/1/recuperar-llave-privada")
    public Map<String, Object> recuperarLlavePrivada() {
        return servicioSimulacion.recuperarLlavePrivada();
    }

    @PostMapping("/laboratorios/1/firmar-certificado-falso")
    public Map<String, Object> firmarCertificadoFalso(@RequestBody DatosCertificado cert) throws Exception {
        return servicioSimulacion.firmarCertificadoFalso(cert);
    }

    @PostMapping("/laboratorios/1/entregar-falso")
    public Map<String, Object> entregarCertificadoFalso(@RequestBody DatosCertificado cert) throws Exception {
        try {
            return servicioSimulacion.entregarCertificadoFalso(cert);
        } catch (IllegalArgumentException e) {
            return Map.of("exito", false, "error", e.getMessage());
        }
    }

}
