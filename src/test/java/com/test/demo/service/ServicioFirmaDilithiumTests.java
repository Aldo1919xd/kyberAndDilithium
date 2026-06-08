package com.test.demo.service;

import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPublicKeyParameters;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import static org.junit.jupiter.api.Assertions.*;

class ServicioFirmaDilithiumTests {

    private static final ServicioFirmaDilithium servicio = new ServicioFirmaDilithium();

    @BeforeAll
    static void init() {
        Security.addProvider(new BouncyCastleProvider());
    }

    @Test
    void generarParLlaves_creaParValido() {
        AsymmetricCipherKeyPair par = servicio.generarParLlaves();
        assertNotNull(par);
        assertInstanceOf(DilithiumPublicKeyParameters.class, par.getPublic());
        assertInstanceOf(DilithiumPrivateKeyParameters.class, par.getPrivate());
    }

    @Test
    void firmarYVerificar_roundtripExitoso() {
        AsymmetricCipherKeyPair par = servicio.generarParLlaves();
        DilithiumPrivateKeyParameters priv = (DilithiumPrivateKeyParameters) par.getPrivate();
        DilithiumPublicKeyParameters pub = (DilithiumPublicKeyParameters) par.getPublic();

        byte[] datos = "datos del certificado".getBytes(StandardCharsets.UTF_8);
        byte[] firma = servicio.firmar(datos, priv);
        assertNotNull(firma);
        assertTrue(firma.length > 0);

        boolean valido = servicio.verificar(datos, firma, pub);
        assertTrue(valido);
    }

    @Test
    void verificarFirmaIncorrecta_retornaFalso() {
        AsymmetricCipherKeyPair par = servicio.generarParLlaves();
        DilithiumPrivateKeyParameters priv = (DilithiumPrivateKeyParameters) par.getPrivate();
        DilithiumPublicKeyParameters pub = (DilithiumPublicKeyParameters) par.getPublic();

        byte[] datos = "datos originales".getBytes(StandardCharsets.UTF_8);
        byte[] firma = servicio.firmar(datos, priv);
        assertTrue(servicio.verificar(datos, firma, pub));

        byte[] datosAlterados = "DATOS ALTERADOS".getBytes(StandardCharsets.UTF_8);
        assertFalse(servicio.verificar(datosAlterados, firma, pub));
    }

    @Test
    void verificarConOtraLlave_retornaFalso() {
        AsymmetricCipherKeyPair par1 = servicio.generarParLlaves();
        AsymmetricCipherKeyPair par2 = servicio.generarParLlaves();
        DilithiumPrivateKeyParameters priv1 = (DilithiumPrivateKeyParameters) par1.getPrivate();
        DilithiumPublicKeyParameters pub2 = (DilithiumPublicKeyParameters) par2.getPublic();

        byte[] datos = "datos".getBytes(StandardCharsets.UTF_8);
        byte[] firma = servicio.firmar(datos, priv1);

        assertFalse(servicio.verificar(datos, firma, pub2));
    }

    @Test
    void firmaConRandomSemillaFija_esConsistente() {
        com.test.demo.model.RandomSemillaFija rs1 = new com.test.demo.model.RandomSemillaFija(12345L);
        com.test.demo.model.RandomSemillaFija rs2 = new com.test.demo.model.RandomSemillaFija(12345L);

        AsymmetricCipherKeyPair par1 = servicio.generarParLlaves(rs1);
        AsymmetricCipherKeyPair par2 = servicio.generarParLlaves(rs2);

        byte[] pub1Enc = ((DilithiumPublicKeyParameters) par1.getPublic()).getEncoded();
        byte[] pub2Enc = ((DilithiumPublicKeyParameters) par2.getPublic()).getEncoded();

        assertArrayEquals(pub1Enc, pub2Enc, "Misma semilla debe producir mismo keypair");
    }

    @Test
    void firmaConRandomSemillaFija_verifica() {
        com.test.demo.model.RandomSemillaFija rs = new com.test.demo.model.RandomSemillaFija(12345L);
        AsymmetricCipherKeyPair par = servicio.generarParLlaves(rs);
        DilithiumPrivateKeyParameters priv = (DilithiumPrivateKeyParameters) par.getPrivate();
        DilithiumPublicKeyParameters pub = (DilithiumPublicKeyParameters) par.getPublic();

        byte[] datos = "datos".getBytes(StandardCharsets.UTF_8);
        byte[] firma = servicio.firmar(datos, priv, rs);

        assertTrue(servicio.verificar(datos, firma, pub));
    }
}
