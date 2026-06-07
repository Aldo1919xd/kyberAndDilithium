package com.test.demo.service;

import com.test.demo.model.CertificateData;
import com.test.demo.model.EncryptedPayload;
import com.test.demo.model.FixedRandom;
import com.test.demo.util.CertUtils;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPublicKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPublicKeyParameters;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.stereotype.Service;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SimulationService {

    private final DilithiumService dilithiumService;
    private final KyberService kyberService;
    private final UniversityService universityService;

    private boolean weakRngActive = false;

    // Lab 3: Fake university identity
    private DilithiumPublicKeyParameters fakeUniPubKey;
    private DilithiumPrivateKeyParameters fakeUniPrivKey;

    // Lab 2: Mallory's keys
    private final ConcurrentHashMap<String, StoredInterception> interceptions = new ConcurrentHashMap<>();

    private record StoredInterception(
        KyberPublicKeyParameters originalPubKey,
        KyberPrivateKeyParameters originalPrivKey,
        KyberPublicKeyParameters malloryPubKey,
        KyberPrivateKeyParameters malloryPrivKey
    ) {}

    public SimulationService(DilithiumService dilithiumService, KyberService kyberService, UniversityService universityService) {
        this.dilithiumService = dilithiumService;
        this.kyberService = kyberService;
        this.universityService = universityService;
    }

    // ========== LAB 1: Weak RNG ==========

    public void setWeakRng(boolean active) {
        this.weakRngActive = active;
    }

    public boolean isWeakRngActive() {
        return weakRngActive;
    }

    public FixedRandom getFixedRandom() {
        return new FixedRandom(12345L);
    }

    public Map<String, Object> extractPrivateKey() {
        FixedRandom fr = getFixedRandom();
        AsymmetricCipherKeyPair pair = dilithiumService.generateKeyPair(fr);
        DilithiumPrivateKeyParameters priv = (DilithiumPrivateKeyParameters) pair.getPrivate();
        DilithiumPublicKeyParameters pub = (DilithiumPublicKeyParameters) pair.getPublic();
        return Map.of(
            "privateKey", Hex.toHexString(priv.getEncoded()),
            "publicKey", Hex.toHexString(pub.getEncoded()),
            "seed", 12345
        );
    }

    public Map<String, Object> forgeFakeCert(CertificateData cert) throws Exception {
        FixedRandom fr = getFixedRandom();
        AsymmetricCipherKeyPair pair = dilithiumService.generateKeyPair(fr);
        DilithiumPrivateKeyParameters priv = (DilithiumPrivateKeyParameters) pair.getPrivate();
        DilithiumPublicKeyParameters pub = (DilithiumPublicKeyParameters) pair.getPublic();

        byte[] certBytes = CertUtils.toCanonicalBytes(cert);
        byte[] signature = dilithiumService.sign(certBytes, priv, fr);

        // Verify with the same key (should pass)
        boolean valid = dilithiumService.verify(certBytes, signature, pub);

        return Map.of(
            "certificate", Map.of(
                "student", cert.student(),
                "course", cert.course(),
                "grade", cert.grade(),
                "date", cert.date()
            ),
            "signature", Hex.toHexString(signature),
            "publicKey", Hex.toHexString(pub.getEncoded()),
            "valid", valid
        );
    }

    // ========== LAB 2: MITM Kyber ==========

    public Map<String, Object> interceptStudent(String studentName) throws Exception {
        KyberPublicKeyParameters originalPub = universityService.getStudentPublicKey(studentName);
        KyberPrivateKeyParameters originalPriv = universityService.getStudentPrivateKey(studentName);
        if (originalPub == null) throw new IllegalArgumentException("Estudiante no encontrado");

        // Generate Mallory's key pair
        AsymmetricCipherKeyPair malloryPair = kyberService.generateKeyPair();
        KyberPublicKeyParameters malloryPub = (KyberPublicKeyParameters) malloryPair.getPublic();
        KyberPrivateKeyParameters malloryPriv = (KyberPrivateKeyParameters) malloryPair.getPrivate();

        interceptions.put(studentName, new StoredInterception(originalPub, originalPriv, malloryPub, malloryPriv));
        universityService.swapStudentPublicKey(studentName, malloryPub);

        return Map.of(
            "success", true,
            "student", studentName,
            "originalPublicKey", Hex.toHexString(originalPub.getEncoded()),
            "malloryPublicKey", Hex.toHexString(malloryPub.getEncoded()),
            "message", "Clave pública de " + studentName + " reemplazada por la de Mallory. Ahora entrega un certificado desde la vista Director."
        );
    }

    public boolean isIntercepted(String studentName) {
        return interceptions.containsKey(studentName);
    }

    public Map<String, Object> malloryReadInbox(String studentName) throws Exception {
        StoredInterception si = interceptions.get(studentName);
        if (si == null) throw new IllegalArgumentException("No hay intercepción activa para " + studentName);

        var inbox = universityService.getInbox(studentName);
        if (inbox.isEmpty()) throw new IllegalArgumentException("Bandeja vacía. Primero entrega un certificado desde Director.");

        // Read the latest inbox item with Mallory's key
        Map<String, Object> latest = inbox.get(inbox.size() - 1);
        byte[] ciphertext = Hex.decodeStrict((String) latest.get("ciphertext"));
        byte[] iv = Hex.decodeStrict((String) latest.get("iv"));
        byte[] encryptedData = Hex.decodeStrict((String) latest.get("encryptedData"));

        EncryptedPayload payload = new EncryptedPayload(ciphertext, iv, encryptedData);
        byte[] decryptedBytes = kyberService.decrypt(payload, si.malloryPrivKey());

        ObjectMapper mapper = new ObjectMapper();
        @SuppressWarnings("unchecked")
        Map<String, Object> cert = mapper.readValue(decryptedBytes, Map.class);

        return Map.of(
            "success", true,
            "interceptedCertificate", cert,
            "message", "Mallory descifró el certificado usando su clave privada. El contenido era visible para un atacante."
        );
    }

    public Map<String, Object> restoreAndForward(String studentName) throws Exception {
        StoredInterception si = interceptions.get(studentName);
        if (si == null) throw new IllegalArgumentException("No hay intercepción activa para " + studentName);

        // Restore original keys
        universityService.swapStudentPublicKey(studentName, si.originalPubKey());
        // universityService doesn't have swapStudentPrivateKey, so we handle it internally
        // Actually, we need a method to restore both pub and priv keys
        universityService.restoreStudentKeys(studentName, si.originalPubKey(), si.originalPrivKey());

        // Re-encrypt latest inbox item with real student key
        var inbox = universityService.getInbox(studentName);
        if (inbox.isEmpty()) throw new IllegalArgumentException("Bandeja vacía");

        Map<String, Object> latest = new LinkedHashMap<>(inbox.get(inbox.size() - 1));
        @SuppressWarnings("unchecked")
        Map<String, Object> certMap = (Map<String, Object>) latest.get("certificate");
        CertificateData cert = CertUtils.fromMap(certMap);

        EncryptedPayload newPayload = universityService.encryptForStudent(studentName, cert);

        // Update the inbox item
        latest.put("ciphertext", Hex.toHexString(newPayload.ciphertext()));
        latest.put("iv", Hex.toHexString(newPayload.iv()));
        latest.put("encryptedData", Hex.toHexString(newPayload.encryptedData()));
        universityService.updateInboxItem(studentName, (String) latest.get("id"), latest);

        interceptions.remove(studentName);

        return Map.of(
            "success", true,
            "student", studentName,
            "message", "Clave restaurada y certificado re-cifrado para " + studentName + ". Ahora revisa la bandeja del estudiante."
        );
    }

    // ========== LAB 3: Fake Identity ==========

    public Map<String, Object> createFakeIdentity() {
        AsymmetricCipherKeyPair pair = dilithiumService.generateKeyPair();
        fakeUniPubKey = (DilithiumPublicKeyParameters) pair.getPublic();
        fakeUniPrivKey = (DilithiumPrivateKeyParameters) pair.getPrivate();

        return Map.of(
            "success", true,
            "fakePublicKey", Hex.toHexString(fakeUniPubKey.getEncoded())
        );
    }

    public boolean hasFakeIdentity() {
        return fakeUniPubKey != null;
    }

    public Map<String, Object> getFakeIdentity() {
        if (fakeUniPubKey == null) return Map.of("exists", false);
        return Map.of(
            "exists", true,
            "fakePublicKey", Hex.toHexString(fakeUniPubKey.getEncoded())
        );
    }

    public Map<String, Object> signWithFakeIdentity(CertificateData cert) throws Exception {
        if (fakeUniPrivKey == null) throw new IllegalArgumentException("Primero crea la identidad falsa");

        byte[] certBytes = CertUtils.toCanonicalBytes(cert);
        byte[] signature = dilithiumService.sign(certBytes, fakeUniPrivKey);

        boolean valid = dilithiumService.verify(certBytes, signature, fakeUniPubKey);

        return Map.of(
            "success", true,
            "certificate", Map.of(
                "student", cert.student(),
                "course", cert.course(),
                "grade", cert.grade(),
                "date", cert.date()
            ),
            "signature", Hex.toHexString(signature),
            "publicKey", Hex.toHexString(fakeUniPubKey.getEncoded()),
            "verifiedWithFakeKey", valid
        );
    }
}
