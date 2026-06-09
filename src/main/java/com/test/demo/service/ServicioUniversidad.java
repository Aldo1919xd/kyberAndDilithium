package com.test.demo.service;

import com.test.demo.model.DatosCertificado;
import com.test.demo.model.PaqueteCifrado;
import com.test.demo.util.UtilidadesCertificado;
import jakarta.annotation.PostConstruct;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPublicKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPublicKeyParameters;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ServicioUniversidad {

    private final ServicioFirmaDilithium servicioFirma;
    private final ServicioCifradoKyber servicioCifrado;

    private DilithiumPublicKeyParameters llavePublicaUniversidad;
    private DilithiumPrivateKeyParameters llavePrivadaUniversidad;
    private boolean inicializada = false;

    private final ConcurrentHashMap<String, KyberPublicKeyParameters> llavesPublicasEstudiantes = new ConcurrentHashMap<>();
    private final List<Map<String, Object>> certificadosEmitidos = new ArrayList<>();
    private final ConcurrentHashMap<String, List<Map<String, Object>>> bandejas = new ConcurrentHashMap<>();

    public ServicioUniversidad(ServicioFirmaDilithium servicioFirma, ServicioCifradoKyber servicioCifrado) {
        this.servicioFirma = servicioFirma;
        this.servicioCifrado = servicioCifrado;
    }

    @PostConstruct
    public synchronized void iniciarAutomaticamente() {
        if (!inicializada) {
            inicializarUniversidad();
        }
    }

    public synchronized void inicializarUniversidad() {
        AsymmetricCipherKeyPair par = servicioFirma.generarParLlaves();
        llavePublicaUniversidad = (DilithiumPublicKeyParameters) par.getPublic();
        llavePrivadaUniversidad = (DilithiumPrivateKeyParameters) par.getPrivate();
        inicializada = true;
    }

    public synchronized void reinicializarConRandom(java.security.SecureRandom aleatorio) {
        AsymmetricCipherKeyPair par = servicioFirma.generarParLlaves(aleatorio);
        llavePublicaUniversidad = (DilithiumPublicKeyParameters) par.getPublic();
        llavePrivadaUniversidad = (DilithiumPrivateKeyParameters) par.getPrivate();
        inicializada = true;
    }

    public boolean estaInicializada() {
        return inicializada;
    }

    public byte[] obtenerLlavePublicaUniversidad() {
        return llavePublicaUniversidad.getEncoded();
    }

    public void registrarEstudiante(String nombre, byte[] llavePublica) {
        KyberPublicKeyParameters llave = new KyberPublicKeyParameters(KyberParameters.kyber768, llavePublica);
        llavesPublicasEstudiantes.put(nombre, llave);
    }

    public Set<String> obtenerNombresEstudiantes() {
        return llavesPublicasEstudiantes.keySet();
    }

    public String obtenerLlavePublicaEstudianteHex(String nombre) {
        KyberPublicKeyParameters llave = llavesPublicasEstudiantes.get(nombre);
        if (llave == null) return "";
        return Hex.toHexString(llave.getEncoded());
    }

    public synchronized Map<String, Object> firmarCertificado(DatosCertificado cert) throws Exception {
        if (!llavesPublicasEstudiantes.containsKey(cert.estudiante())) {
            throw new IllegalArgumentException("El estudiante '" + cert.estudiante() + "' no esta registrado. Creelo primero.");
        }
        byte[] bytesCert = UtilidadesCertificado.aBytesCanonicos(cert);
        byte[] firma = servicioFirma.firmar(bytesCert, llavePrivadaUniversidad);
        String id = UUID.randomUUID().toString();

        Map<String, Object> entrada = new LinkedHashMap<>();
        entrada.put("id", id);
        entrada.put("certificado", Map.of(
            "estudiante", cert.estudiante(),
            "curso", cert.curso(),
            "nota", cert.nota(),
            "fecha", cert.fecha()
        ));
        entrada.put("firma", Hex.toHexString(firma));
        entrada.put("estado", "emitido");
        entrada.put("estudiante", cert.estudiante());
        certificadosEmitidos.add(entrada);

        return entrada;
    }

    public boolean verificarFirmaCertificado(DatosCertificado cert, byte[] firma) throws Exception {
        byte[] bytesCert = UtilidadesCertificado.aBytesCanonicos(cert);
        return servicioFirma.verificar(bytesCert, firma, llavePublicaUniversidad);
    }

    public List<Map<String, Object>> obtenerTodosCertificados() {
        return List.copyOf(certificadosEmitidos);
    }

    public synchronized Map<String, Object> entregarCertificado(String idCertificado, String nombreEstudiante) throws Exception {
        Map<String, Object> encontrado = null;
        for (Map<String, Object> cert : certificadosEmitidos) {
            if (cert.get("id").equals(idCertificado) && "emitido".equals(cert.get("estado"))) {
                encontrado = cert;
                break;
            }
        }
        if (encontrado == null) throw new IllegalArgumentException("Certificado no encontrado o ya entregado");

        @SuppressWarnings("unchecked")
        DatosCertificado datos = UtilidadesCertificado.desdeMapa((Map<String, Object>) encontrado.get("certificado"));
        if (!datos.estudiante().equals(nombreEstudiante)) {
            throw new IllegalArgumentException("El certificado pertenece a " + datos.estudiante() + ", no a " + nombreEstudiante);
        }

        PaqueteCifrado paquete = cifrarParaEstudiante(nombreEstudiante, datos);
        byte[] firma = Hex.decodeStrict((String) encontrado.get("firma"));

        Map<String, Object> elementoBandeja = new LinkedHashMap<>();
        elementoBandeja.put("id", idCertificado);
        elementoBandeja.put("certificado", encontrado.get("certificado"));
        elementoBandeja.put("firma", Hex.toHexString(firma));
        elementoBandeja.put("textoCifrado", Hex.toHexString(paquete.textoCifrado()));
        elementoBandeja.put("iv", Hex.toHexString(paquete.iv()));
        elementoBandeja.put("datosCifrados", Hex.toHexString(paquete.datosCifrados()));
        elementoBandeja.put("estado", "entregado");

        insertarEnBandeja(nombreEstudiante, elementoBandeja);
        encontrado.put("estado", "entregado");

        return elementoBandeja;
    }

    public List<Map<String, Object>> obtenerBandeja(String nombreEstudiante) {
        return List.copyOf(bandejas.getOrDefault(nombreEstudiante, List.of()));
    }

    public void insertarEnBandeja(String nombreEstudiante, Map<String, Object> elemento) {
        bandejas.computeIfAbsent(nombreEstudiante, k -> new CopyOnWriteArrayList<>()).add(elemento);
    }

    public PaqueteCifrado cifrarParaEstudiante(String nombreEstudiante, DatosCertificado cert) throws Exception {
        KyberPublicKeyParameters llavePublica = llavesPublicasEstudiantes.get(nombreEstudiante);
        if (llavePublica == null) throw new IllegalArgumentException("Estudiante no encontrado: " + nombreEstudiante);
        byte[] bytesCert = UtilidadesCertificado.aBytesCanonicos(cert);
        return servicioCifrado.cifrar(bytesCert, llavePublica);
    }

}
