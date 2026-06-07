package com.test.demo.service;

import com.test.demo.model.EncryptedPayload;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.SecretWithEncapsulation;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberKeyGenerationParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberKeyPairGenerator;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberKEMExtractor;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberKEMGenerator;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPublicKeyParameters;
import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;

@Service
public class KyberService {

    private final SecureRandom secureRandom = new SecureRandom();

    public AsymmetricCipherKeyPair generateKeyPair() {
        return generateKeyPair(secureRandom);
    }

    public AsymmetricCipherKeyPair generateKeyPair(SecureRandom random) {
        KyberKeyPairGenerator generator = new KyberKeyPairGenerator();
        generator.init(new KyberKeyGenerationParameters(random, KyberParameters.kyber768));
        return generator.generateKeyPair();
    }

    public EncryptedPayload encrypt(byte[] data, KyberPublicKeyParameters publicKey) throws Exception {
        return encrypt(data, publicKey, secureRandom);
    }

    public EncryptedPayload encrypt(byte[] data, KyberPublicKeyParameters publicKey, SecureRandom random) throws Exception {
        KyberKEMGenerator kemGen = new KyberKEMGenerator(random);
        SecretWithEncapsulation secret = kemGen.generateEncapsulated(publicKey);
        byte[] sharedSecret = secret.getSecret();
        byte[] ciphertext = secret.getEncapsulation();

        byte[] iv = new byte[12];
        random.nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,
            new SecretKeySpec(sharedSecret, "AES"),
            new GCMParameterSpec(128, iv));
        byte[] encryptedData = cipher.doFinal(data);

        return new EncryptedPayload(ciphertext, iv, encryptedData);
    }

    public byte[] decrypt(EncryptedPayload payload, KyberPrivateKeyParameters privateKey) throws Exception {
        KyberKEMExtractor extractor = new KyberKEMExtractor(privateKey);
        byte[] sharedSecret = extractor.extractSecret(payload.ciphertext());

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,
            new SecretKeySpec(sharedSecret, "AES"),
            new GCMParameterSpec(128, payload.iv()));
        return cipher.doFinal(payload.encryptedData());
    }
}
