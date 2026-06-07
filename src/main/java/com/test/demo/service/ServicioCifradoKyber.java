package com.test.demo.service;

import com.test.demo.model.PaqueteCifrado;
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
public class ServicioCifradoKyber {

    private final SecureRandom aleatorioSeguro = new SecureRandom();

    public AsymmetricCipherKeyPair generarParLlaves() {
        return generarParLlaves(aleatorioSeguro);
    }

    public AsymmetricCipherKeyPair generarParLlaves(SecureRandom aleatorio) {
        KyberKeyPairGenerator generador = new KyberKeyPairGenerator();
        generador.init(new KyberKeyGenerationParameters(aleatorio, KyberParameters.kyber768));
        return generador.generateKeyPair();
    }

    public PaqueteCifrado cifrar(byte[] datos, KyberPublicKeyParameters llavePublica) throws Exception {
        return cifrar(datos, llavePublica, aleatorioSeguro);
    }

    public PaqueteCifrado cifrar(byte[] datos, KyberPublicKeyParameters llavePublica, SecureRandom aleatorio) throws Exception {
        KyberKEMGenerator generadorKem = new KyberKEMGenerator(aleatorio);
        SecretWithEncapsulation secreto = generadorKem.generateEncapsulated(llavePublica);
        byte[] secretoCompartido = secreto.getSecret();
        byte[] textoCifrado = secreto.getEncapsulation();

        byte[] iv = new byte[12];
        aleatorio.nextBytes(iv);
        Cipher cifrador = Cipher.getInstance("AES/GCM/NoPadding");
        cifrador.init(Cipher.ENCRYPT_MODE,
            new SecretKeySpec(secretoCompartido, "AES"),
            new GCMParameterSpec(128, iv));
        byte[] datosCifrados = cifrador.doFinal(datos);

        return new PaqueteCifrado(textoCifrado, iv, datosCifrados);
    }

    public byte[] descifrar(PaqueteCifrado paquete, KyberPrivateKeyParameters llavePrivada) throws Exception {
        KyberKEMExtractor extractor = new KyberKEMExtractor(llavePrivada);
        byte[] secretoCompartido = extractor.extractSecret(paquete.textoCifrado());

        Cipher cifrador = Cipher.getInstance("AES/GCM/NoPadding");
        cifrador.init(Cipher.DECRYPT_MODE,
            new SecretKeySpec(secretoCompartido, "AES"),
            new GCMParameterSpec(128, paquete.iv()));
        return cifrador.doFinal(paquete.datosCifrados());
    }
}
