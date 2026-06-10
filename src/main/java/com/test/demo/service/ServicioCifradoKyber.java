package com.test.demo.service;

import com.test.demo.model.PaqueteCifrado;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.SecretWithEncapsulation;
import org.bouncycastle.crypto.generators.MLKEMKeyPairGenerator;
import org.bouncycastle.crypto.kems.MLKEMExtractor;
import org.bouncycastle.crypto.kems.MLKEMGenerator;
import org.bouncycastle.crypto.params.MLKEMKeyGenerationParameters;
import org.bouncycastle.crypto.params.MLKEMParameters;
import org.bouncycastle.crypto.params.MLKEMPrivateKeyParameters;
import org.bouncycastle.crypto.params.MLKEMPublicKeyParameters;
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
        MLKEMKeyPairGenerator generador = new MLKEMKeyPairGenerator();
        generador.init(new MLKEMKeyGenerationParameters(aleatorio, MLKEMParameters.ml_kem_768));
        return generador.generateKeyPair();
    }

    public PaqueteCifrado cifrar(byte[] datos, MLKEMPublicKeyParameters llavePublica) throws Exception {
        return cifrar(datos, llavePublica, aleatorioSeguro);
    }

    public PaqueteCifrado cifrar(byte[] datos, MLKEMPublicKeyParameters llavePublica, SecureRandom aleatorio) throws Exception {
        MLKEMGenerator generadorKem = new MLKEMGenerator(aleatorio);
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

    public byte[] descifrar(PaqueteCifrado paquete, MLKEMPrivateKeyParameters llavePrivada) throws Exception {
        MLKEMExtractor extractor = new MLKEMExtractor(llavePrivada);
        byte[] secretoCompartido = extractor.extractSecret(paquete.textoCifrado());

        Cipher cifrador = Cipher.getInstance("AES/GCM/NoPadding");
        cifrador.init(Cipher.DECRYPT_MODE,
            new SecretKeySpec(secretoCompartido, "AES"),
            new GCMParameterSpec(128, paquete.iv()));
        return cifrador.doFinal(paquete.datosCifrados());
    }
}
