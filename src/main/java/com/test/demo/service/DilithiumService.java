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
public class DilithiumService {

    private final SecureRandom secureRandom = new SecureRandom();

    public AsymmetricCipherKeyPair generateKeyPair() {
        return generateKeyPair(secureRandom);
    }

    public AsymmetricCipherKeyPair generateKeyPair(SecureRandom random) {
        DilithiumKeyPairGenerator generator = new DilithiumKeyPairGenerator();
        generator.init(new DilithiumKeyGenerationParameters(random, DilithiumParameters.dilithium2));
        return generator.generateKeyPair();
    }

    public byte[] sign(byte[] data, DilithiumPrivateKeyParameters privateKey) {
        return sign(data, privateKey, secureRandom);
    }

    public byte[] sign(byte[] data, DilithiumPrivateKeyParameters privateKey, SecureRandom random) {
        DilithiumSigner signer = new DilithiumSigner();
        signer.init(true, new ParametersWithRandom(privateKey, random));
        return signer.generateSignature(data);
    }

    public boolean verify(byte[] data, byte[] signature, DilithiumPublicKeyParameters publicKey) {
        DilithiumSigner signer = new DilithiumSigner();
        signer.init(false, publicKey);
        return signer.verifySignature(data, signature);
    }
}
