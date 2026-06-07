package com.test.demo.service;

import com.test.demo.model.DatosCertificado;
import com.test.demo.model.RandomSemillaFija;
import com.test.demo.util.UtilidadesCertificado;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPublicKeyParameters;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class ServicioSimulacion {

    private final ServicioFirmaDilithium servicioFirma;

    private boolean rngDebilActivo = false;

    public ServicioSimulacion(ServicioFirmaDilithium servicioFirma) {
        this.servicioFirma = servicioFirma;
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
        DilithiumPrivateKeyParameters priv = (DilithiumPrivateKeyParameters) par.getPrivate();
        DilithiumPublicKeyParameters pub = (DilithiumPublicKeyParameters) par.getPublic();
        return Map.of(
            "llavePrivada", Hex.toHexString(priv.getEncoded()),
            "llavePublica", Hex.toHexString(pub.getEncoded()),
            "semilla", 12345
        );
    }

    public Map<String, Object> firmarCertificadoFalso(DatosCertificado cert) throws Exception {
        RandomSemillaFija rs = obtenerRandomSemillaFija();
        AsymmetricCipherKeyPair par = servicioFirma.generarParLlaves(rs);
        DilithiumPrivateKeyParameters priv = (DilithiumPrivateKeyParameters) par.getPrivate();
        DilithiumPublicKeyParameters pub = (DilithiumPublicKeyParameters) par.getPublic();

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

}
