package com.test.demo.service;

import com.test.demo.model.DatosCertificado;
import com.test.demo.model.RandomSemillaFija;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPublicKeyParameters;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.security.Security;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ServicioUniversidadTests {

    private final ServicioFirmaDilithium servicioFirma = new ServicioFirmaDilithium();
    private final ServicioCifradoKyber servicioCifrado = new ServicioCifradoKyber();
    private ServicioUniversidad servicio;

    @BeforeAll
    static void init() {
        Security.addProvider(new BouncyCastleProvider());
    }

    @BeforeEach
    void setUp() {
        servicio = new ServicioUniversidad(servicioFirma, servicioCifrado);
        servicio.inicializarUniversidad();
    }

    private static byte[] generarLlavePublicaEstudiante() {
        ServicioCifradoKyber cs = new ServicioCifradoKyber();
        AsymmetricCipherKeyPair par = cs.generarParLlaves();
        return ((KyberPublicKeyParameters) par.getPublic()).getEncoded();
    }

    private void crearEstudiante(String nombre) {
        servicio.registrarEstudiante(nombre, generarLlavePublicaEstudiante());
    }

    @Test
    void inicializarUniversidad_funciona() {
        assertTrue(servicio.estaInicializada());
        assertNotNull(servicio.obtenerLlavePublicaUniversidad());
        assertTrue(servicio.obtenerLlavePublicaUniversidad().length > 0);
    }

    @Test
    void registrarEstudiante_guardaPublicKey() {
        crearEstudiante("Alice");
        assertEquals(1, servicio.obtenerNombresEstudiantes().size());
        assertTrue(servicio.obtenerNombresEstudiantes().contains("Alice"));
        String hex = servicio.obtenerLlavePublicaEstudianteHex("Alice");
        assertNotNull(hex);
        assertFalse(hex.isEmpty());
    }

    @Test
    void estudianteDuplicado_sobrescribeLlaves() {
        crearEstudiante("Alice");
        String llave1 = servicio.obtenerLlavePublicaEstudianteHex("Alice");
        crearEstudiante("Alice");
        String llave2 = servicio.obtenerLlavePublicaEstudianteHex("Alice");
        assertNotNull(llave1);
        assertNotNull(llave2);
    }

    @Test
    void firmarCertificado_paraEstudianteExistente() throws Exception {
        crearEstudiante("Alice");
        DatosCertificado cert = new DatosCertificado("Alice", "Matematicas", 95, "2025-06-01");
        Map<String, Object> resultado = servicio.firmarCertificado(cert);
        assertEquals("emitido", resultado.get("estado"));
        assertNotNull(resultado.get("id"));
        assertNotNull(resultado.get("firma"));
    }

    @Test
    void firmarCertificado_paraEstudianteInexistente_lanzaExcepcion() {
        DatosCertificado cert = new DatosCertificado("Inexistente", "Curso", 50, "2025-01-01");
        assertThrows(IllegalArgumentException.class, () -> servicio.firmarCertificado(cert));
    }

    @Test
    void flujoCompleto_emitirEntregar() throws Exception {
        crearEstudiante("Bob");
        DatosCertificado cert = new DatosCertificado("Bob", "Fisica", 88, "2025-06-15");
        Map<String, Object> emitido = servicio.firmarCertificado(cert);
        String id = (String) emitido.get("id");

        Map<String, Object> entrega = servicio.entregarCertificado(id, "Bob");
        assertNotNull(entrega);
        assertEquals("entregado", entrega.get("estado"));
        assertNotNull(entrega.get("textoCifrado"));
        assertNotNull(entrega.get("iv"));
        assertNotNull(entrega.get("datosCifrados"));
    }

    @Test
    void bandejaContieneElementosDespuesDeEntrega() throws Exception {
        crearEstudiante("Bob");
        DatosCertificado cert = new DatosCertificado("Bob", "Fisica", 88, "2025-06-15");
        Map<String, Object> emitido = servicio.firmarCertificado(cert);
        String id = (String) emitido.get("id");

        servicio.entregarCertificado(id, "Bob");
        List<Map<String, Object>> bandeja = servicio.obtenerBandeja("Bob");
        assertEquals(1, bandeja.size());
    }

    @Test
    void estudianteSinBandeja_retornaVacio() {
        crearEstudiante("Eve");
        assertTrue(servicio.obtenerBandeja("Eve").isEmpty());
    }

    @Test
    void entregarCertificado_yaEntregado_lanzaExcepcion() throws Exception {
        crearEstudiante("Bob");
        DatosCertificado cert = new DatosCertificado("Bob", "Fisica", 88, "2025-06-15");
        Map<String, Object> emitido = servicio.firmarCertificado(cert);
        String id = (String) emitido.get("id");

        servicio.entregarCertificado(id, "Bob");
        assertThrows(IllegalArgumentException.class, () -> servicio.entregarCertificado(id, "Bob"));
    }

    @Test
    void verificarFirmaCertificado_valida() throws Exception {
        crearEstudiante("Alice");
        DatosCertificado cert = new DatosCertificado("Alice", "Historia", 90, "2025-06-01");
        Map<String, Object> emitido = servicio.firmarCertificado(cert);
        byte[] firma = org.bouncycastle.util.encoders.Hex.decodeStrict((String) emitido.get("firma"));
        assertTrue(servicio.verificarFirmaCertificado(cert, firma));
    }

    @Test
    void historial_contieneCertificadosEmitidos() throws Exception {
        crearEstudiante("Alice");
        servicio.firmarCertificado(new DatosCertificado("Alice", "Curso1", 80, "2025-01-01"));
        servicio.firmarCertificado(new DatosCertificado("Alice", "Curso2", 90, "2025-02-01"));
        assertEquals(2, servicio.obtenerTodosCertificados().size());
    }

    @Test
    void reInicializarUniversidad_conRandomSemillaFija_verifica() throws Exception {
        crearEstudiante("Alice");
        DatosCertificado cert = new DatosCertificado("Alice", "Test", 85, "2025-06-01");

        byte[] pubKeyOriginal = servicio.obtenerLlavePublicaUniversidad().clone();

        RandomSemillaFija rs = new RandomSemillaFija(12345L);
        servicio.reinicializarConRandom(rs);

        byte[] pubKeyFija = servicio.obtenerLlavePublicaUniversidad().clone();

        assertFalse(java.util.Arrays.equals(pubKeyOriginal, pubKeyFija),
            "Keypair debe cambiar tras reinicializar");

        RandomSemillaFija rs2 = new RandomSemillaFija(12345L);
        ServicioUniversidad servicio2 = new ServicioUniversidad(servicioFirma, servicioCifrado);
        servicio2.inicializarUniversidad();
        crearEstudiante("Alice");
        servicio2.reinicializarConRandom(rs2);

        byte[] pubKeyFija2 = servicio2.obtenerLlavePublicaUniversidad();
        assertArrayEquals(pubKeyFija, pubKeyFija2, "Misma semilla debe producir mismo keypair");

        Map<String, Object> emitido = servicio.firmarCertificado(cert);
        byte[] firma = org.bouncycastle.util.encoders.Hex.decodeStrict((String) emitido.get("firma"));

        assertTrue(servicio.verificarFirmaCertificado(cert, firma),
            "Firma debe verificar contra la llave posterior a reinicializar");
    }

}
