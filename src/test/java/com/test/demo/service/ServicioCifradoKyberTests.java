package com.test.demo.service;

import com.test.demo.model.PaqueteCifrado;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPublicKeyParameters;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import static org.junit.jupiter.api.Assertions.*;

class ServicioCifradoKyberTests {

    private static final ServicioCifradoKyber servicio = new ServicioCifradoKyber();

    @BeforeAll
    static void init() {
        Security.addProvider(new BouncyCastleProvider());
    }

    @Test
    void generarParLlaves_creaParValido() {
        AsymmetricCipherKeyPair par = servicio.generarParLlaves();
        assertNotNull(par);
        assertInstanceOf(KyberPublicKeyParameters.class, par.getPublic());
        assertInstanceOf(KyberPrivateKeyParameters.class, par.getPrivate());
        assertTrue(((KyberPublicKeyParameters) par.getPublic()).getEncoded().length > 0);
    }

    @Test
    void cifrarYDescifrar_roundtripExitoso() throws Exception {
        AsymmetricCipherKeyPair par = servicio.generarParLlaves();
        KyberPublicKeyParameters pub = (KyberPublicKeyParameters) par.getPublic();
        KyberPrivateKeyParameters priv = (KyberPrivateKeyParameters) par.getPrivate();

        byte[] original = "datos secretos del certificado".getBytes(StandardCharsets.UTF_8);
        PaqueteCifrado paquete = servicio.cifrar(original, pub);

        assertNotNull(paquete.textoCifrado());
        assertNotNull(paquete.iv());
        assertNotNull(paquete.datosCifrados());
        assertTrue(paquete.textoCifrado().length > 0);
        assertEquals(12, paquete.iv().length);

        byte[] descifrado = servicio.descifrar(paquete, priv);
        assertArrayEquals(original, descifrado);
    }

    @Test
    void descifrarConLlaveIncorrecta_lanzaExcepcion() throws Exception {
        AsymmetricCipherKeyPair par1 = servicio.generarParLlaves();
        AsymmetricCipherKeyPair par2 = servicio.generarParLlaves();
        KyberPublicKeyParameters pub1 = (KyberPublicKeyParameters) par1.getPublic();
        KyberPrivateKeyParameters priv2 = (KyberPrivateKeyParameters) par2.getPrivate();

        byte[] original = "test".getBytes(StandardCharsets.UTF_8);
        PaqueteCifrado paquete = servicio.cifrar(original, pub1);

        assertThrows(Exception.class, () -> servicio.descifrar(paquete, priv2));
    }

    @Test
    void cifrarConRandomFijo_esDeterminista() throws Exception {
        java.security.SecureRandom rng1 = new java.security.SecureRandom();
        java.security.SecureRandom rng2 = new java.security.SecureRandom();

        AsymmetricCipherKeyPair par = servicio.generarParLlaves();
        KyberPublicKeyParameters pub = (KyberPublicKeyParameters) par.getPublic();
        KyberPrivateKeyParameters priv = (KyberPrivateKeyParameters) par.getPrivate();

        byte[] datos = "datos".getBytes(StandardCharsets.UTF_8);
        PaqueteCifrado paq1 = servicio.cifrar(datos, pub, rng1);
        PaqueteCifrado paq2 = servicio.cifrar(datos, pub, rng2);

        byte[] dec1 = servicio.descifrar(paq1, priv);
        byte[] dec2 = servicio.descifrar(paq2, priv);
        assertArrayEquals(dec1, dec2);
    }
}
