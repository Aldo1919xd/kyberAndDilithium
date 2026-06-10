package com.test.demo.service;

import com.test.demo.model.DatosCertificado;
import com.test.demo.model.PaqueteCifrado;
import com.test.demo.model.RandomSemillaFija;
import com.test.demo.util.UtilidadesCertificado;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.params.MLDSAPrivateKeyParameters;
import org.bouncycastle.crypto.params.MLDSAPublicKeyParameters;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.stereotype.Service;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ServicioSimulacion {

    private final ServicioFirmaDilithium servicioFirma;
    private final ServicioCifradoKyber servicioCifrado;
    private final ServicioUniversidad servicioUniversidad;

    private boolean rngDebilActivo = false;

    public ServicioSimulacion(ServicioFirmaDilithium servicioFirma, ServicioCifradoKyber servicioCifrado, ServicioUniversidad servicioUniversidad) {
        this.servicioFirma = servicioFirma;
        this.servicioCifrado = servicioCifrado;
        this.servicioUniversidad = servicioUniversidad;
    }

    // ========== LABORATORIO 1: RNG Débil ==========

    public void activarRngDebil(boolean activo) {
        this.rngDebilActivo = activo;
    }

    public boolean estaRngDebilActivo() {
        return rngDebilActivo;
    }

    public RandomSemillaFija obtenerRandomSemillaFija() {
        return new RandomSemillaFija(12345L);
    }

    public Map<String, Object> recuperarLlavePrivada() {
        RandomSemillaFija rs = obtenerRandomSemillaFija();
        AsymmetricCipherKeyPair par = servicioFirma.generarParLlaves(rs);
        MLDSAPrivateKeyParameters priv = (MLDSAPrivateKeyParameters) par.getPrivate();
        MLDSAPublicKeyParameters pub = (MLDSAPublicKeyParameters) par.getPublic();
        return Map.of(
            "llavePrivada", Hex.toHexString(priv.getEncoded()),
            "llavePublica", Hex.toHexString(pub.getEncoded()),
            "semilla", 12345
        );
    }

    public Map<String, Object> firmarCertificadoFalso(DatosCertificado cert) throws Exception {
        RandomSemillaFija rs = obtenerRandomSemillaFija();
        AsymmetricCipherKeyPair par = servicioFirma.generarParLlaves(rs);
        MLDSAPrivateKeyParameters priv = (MLDSAPrivateKeyParameters) par.getPrivate();
        MLDSAPublicKeyParameters pub = (MLDSAPublicKeyParameters) par.getPublic();

        byte[] bytesCert = UtilidadesCertificado.aBytesCanonicos(cert);
        byte[] firma = servicioFirma.firmar(bytesCert, priv, rs);

        boolean valido = servicioFirma.verificar(bytesCert, firma, pub);

        return Map.of(
            "certificado", Map.of(
                "estudiante", cert.estudiante(),
                "curso", cert.curso(),
                "nota", cert.nota(),
                "fecha", cert.fecha()
            ),
            "firma", Hex.toHexString(firma),
            "llavePublica", Hex.toHexString(pub.getEncoded()),
            "valido", valido
        );
    }

    public Map<String, Object> entregarCertificadoFalso(DatosCertificado cert) throws Exception {
        RandomSemillaFija rs = obtenerRandomSemillaFija();
        AsymmetricCipherKeyPair par = servicioFirma.generarParLlaves(rs);
        MLDSAPrivateKeyParameters priv = (MLDSAPrivateKeyParameters) par.getPrivate();
        MLDSAPublicKeyParameters pub = (MLDSAPublicKeyParameters) par.getPublic();

        byte[] bytesCert = UtilidadesCertificado.aBytesCanonicos(cert);
        byte[] firma = servicioFirma.firmar(bytesCert, priv, rs);

        boolean valido = servicioFirma.verificar(bytesCert, firma, pub);

        String nombreEstudiante = cert.estudiante();
        PaqueteCifrado paquete = servicioUniversidad.cifrarParaEstudiante(nombreEstudiante, cert);

        String id = UUID.randomUUID().toString();
        Map<String, Object> elementoBandeja = new LinkedHashMap<>();
        elementoBandeja.put("id", id);
        elementoBandeja.put("certificado", Map.of(
            "estudiante", nombreEstudiante,
            "curso", cert.curso(),
            "nota", cert.nota(),
            "fecha", cert.fecha()
        ));
        elementoBandeja.put("firma", Hex.toHexString(firma));
        elementoBandeja.put("textoCifrado", Hex.toHexString(paquete.textoCifrado()));
        elementoBandeja.put("iv", Hex.toHexString(paquete.iv()));
        elementoBandeja.put("datosCifrados", Hex.toHexString(paquete.datosCifrados()));
        elementoBandeja.put("estado", "entregado");

        servicioUniversidad.insertarEnBandeja(nombreEstudiante, elementoBandeja);

        return Map.of(
            "exito", true,
            "valido", valido,
            "firma", Hex.toHexString(firma),
            "certificado", Map.of(
                "estudiante", nombreEstudiante,
                "curso", cert.curso(),
                "nota", cert.nota(),
                "fecha", cert.fecha()
            ),
            "llavePublica", Hex.toHexString(pub.getEncoded())
        );
    }

}
