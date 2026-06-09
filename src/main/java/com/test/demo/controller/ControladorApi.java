package com.test.demo.controller;

import com.test.demo.model.DatosCertificado;
import com.test.demo.model.RandomSemillaFija;
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

    public ControladorApi(ServicioUniversidad servicioUniversidad, ServicioSimulacion servicioSimulacion) {
        this.servicioUniversidad = servicioUniversidad;
        this.servicioSimulacion = servicioSimulacion;
    }

    // ===== Estudiantes =====
    @PostMapping("/estudiante/crear")
    public Map<String, Object> crearEstudiante(@RequestBody Map<String, String> cuerpo) {
        String nombre = cuerpo.get("nombre");
        String llavePublicaHex = cuerpo.get("llavePublica");
        if (nombre == null || nombre.isBlank()) {
            return Map.of("exito", false, "error", "El nombre es obligatorio");
        }
        if (llavePublicaHex == null || llavePublicaHex.isBlank()) {
            return Map.of("exito", false, "error", "La llave publica Kyber es obligatoria");
        }
        byte[] llavePublica = Hex.decodeStrict(llavePublicaHex);
        servicioUniversidad.registrarEstudiante(nombre, llavePublica);
        return Map.of("exito", true, "nombre", nombre,
            "llavePublicaUniversidad", Hex.toHexString(servicioUniversidad.obtenerLlavePublicaUniversidad()));
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
            return Map.of("exito", true, "entrega", entregado, "llavePublicaEstudiante", llavePublicaEstudiante,
                "llavePublicaUniversidad", Hex.toHexString(servicioUniversidad.obtenerLlavePublicaUniversidad()));
        } catch (IllegalArgumentException e) {
            return Map.of("exito", false, "error", e.getMessage());
        }
    }

    @GetMapping("/certificados/bandeja/{nombre}")
    public Map<String, Object> obtenerBandeja(@PathVariable String nombre) {
        return Map.of("bandeja", servicioUniversidad.obtenerBandeja(nombre));
    }

    @GetMapping("/universidad/llave-publica")
    public Map<String, Object> obtenerLlavePublicaUniversidad() {
        return Map.of("llavePublica", Hex.toHexString(servicioUniversidad.obtenerLlavePublicaUniversidad()));
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
