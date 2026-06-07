package com.test.demo.service;

import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.params.ParametersWithRandom;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumKeyGenerationParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumKeyPairGenerator;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPublicKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumSigner;
import org.springframework.stereotype.Service;
import java.security.SecureRandom;

@Service
public class ServicioFirmaDilithium {

    private final SecureRandom aleatorioSeguro = new SecureRandom();

    public AsymmetricCipherKeyPair generarParLlaves() {
        return generarParLlaves(aleatorioSeguro);
    }

    public AsymmetricCipherKeyPair generarParLlaves(SecureRandom aleatorio) {
        DilithiumKeyPairGenerator generator = new DilithiumKeyPairGenerator();
        generator.init(new DilithiumKeyGenerationParameters(aleatorio, DilithiumParameters.dilithium2));
        return generator.generateKeyPair();
    }

    public byte[] firmar(byte[] datos, DilithiumPrivateKeyParameters llavePrivada) {
        return firmar(datos, llavePrivada, aleatorioSeguro);
    }

    public byte[] firmar(byte[] datos, DilithiumPrivateKeyParameters llavePrivada, SecureRandom aleatorio) {
        DilithiumSigner firmador = new DilithiumSigner();
        firmador.init(true, new ParametersWithRandom(llavePrivada, aleatorio));
        return firmador.generateSignature(datos);
    }

    public boolean verificar(byte[] datos, byte[] firma, DilithiumPublicKeyParameters llavePublica) {
        DilithiumSigner firmador = new DilithiumSigner();
        firmador.init(false, llavePublica);
        return firmador.verifySignature(datos, firma);
    }
}
