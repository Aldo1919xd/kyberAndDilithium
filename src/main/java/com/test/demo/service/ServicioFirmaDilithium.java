package com.test.demo.service;

import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.CryptoException;
import org.bouncycastle.crypto.generators.MLDSAKeyPairGenerator;
import org.bouncycastle.crypto.params.MLDSAKeyGenerationParameters;
import org.bouncycastle.crypto.params.MLDSAParameters;
import org.bouncycastle.crypto.params.MLDSAPrivateKeyParameters;
import org.bouncycastle.crypto.params.MLDSAPublicKeyParameters;
import org.bouncycastle.crypto.params.ParametersWithRandom;
import org.bouncycastle.crypto.signers.MLDSASigner;
import org.springframework.stereotype.Service;
import java.security.SecureRandom;

@Service
public class ServicioFirmaDilithium {

    private final SecureRandom aleatorioSeguro = new SecureRandom();

    public AsymmetricCipherKeyPair generarParLlaves() {
        return generarParLlaves(aleatorioSeguro);
    }

    public AsymmetricCipherKeyPair generarParLlaves(SecureRandom aleatorio) {
        MLDSAKeyPairGenerator generator = new MLDSAKeyPairGenerator();
        generator.init(new MLDSAKeyGenerationParameters(aleatorio, MLDSAParameters.ml_dsa_65));
        return generator.generateKeyPair();
    }

    public byte[] firmar(byte[] datos, MLDSAPrivateKeyParameters llavePrivada) {
        return firmar(datos, llavePrivada, aleatorioSeguro);
    }

    public byte[] firmar(byte[] datos, MLDSAPrivateKeyParameters llavePrivada, SecureRandom aleatorio) {
        MLDSASigner firmador = new MLDSASigner();
        firmador.init(true, new ParametersWithRandom(llavePrivada, aleatorio));
        firmador.update(datos, 0, datos.length);
        try {
            return firmador.generateSignature();
        } catch (CryptoException e) {
            throw new IllegalStateException("No se pudo generar la firma Dilithium3", e);
        }
    }

    public boolean verificar(byte[] datos, byte[] firma, MLDSAPublicKeyParameters llavePublica) {
        MLDSASigner firmador = new MLDSASigner();
        firmador.init(false, llavePublica);
        firmador.update(datos, 0, datos.length);
        return firmador.verifySignature(firma);
    }
}
