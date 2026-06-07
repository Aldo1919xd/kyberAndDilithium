package com.test.demo.service;

import com.test.demo.model.CertificateData;
import com.test.demo.model.EncryptedPayload;
import com.test.demo.util.CertUtils;
import jakarta.annotation.PostConstruct;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.dilithium.DilithiumPublicKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPublicKeyParameters;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UniversityService {

    private final DilithiumService dilithiumService;
    private final KyberService kyberService;

    private DilithiumPublicKeyParameters uniPublicKey;
    private DilithiumPrivateKeyParameters uniPrivateKey;
    private boolean initialized = false;

    private final ConcurrentHashMap<String, KyberPublicKeyParameters> studentPubKeys = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, KyberPrivateKeyParameters> studentPrivKeys = new ConcurrentHashMap<>();
    private final List<Map<String, Object>> issuedCertificates = new ArrayList<>();
    private final ConcurrentHashMap<String, List<Map<String, Object>>> inboxes = new ConcurrentHashMap<>();

    public UniversityService(DilithiumService dilithiumService, KyberService kyberService) {
        this.dilithiumService = dilithiumService;
        this.kyberService = kyberService;
    }

    @PostConstruct
    public synchronized void autoInit() {
        if (!initialized) {
            initUniversity();
        }
    }

    public synchronized void initUniversity() {
        AsymmetricCipherKeyPair pair = dilithiumService.generateKeyPair();
        uniPublicKey = (DilithiumPublicKeyParameters) pair.getPublic();
        uniPrivateKey = (DilithiumPrivateKeyParameters) pair.getPrivate();
        initialized = true;
    }

    public synchronized void initWithRandom(java.security.SecureRandom random) {
        AsymmetricCipherKeyPair pair = dilithiumService.generateKeyPair(random);
        uniPublicKey = (DilithiumPublicKeyParameters) pair.getPublic();
        uniPrivateKey = (DilithiumPrivateKeyParameters) pair.getPrivate();
        initialized = true;
    }

    public boolean isInitialized() {
        return initialized;
    }

    public byte[] getUniPublicKeyEncoded() {
        return uniPublicKey.getEncoded();
    }

    public void createStudent(String name) {
        AsymmetricCipherKeyPair pair = kyberService.generateKeyPair();
        studentPubKeys.put(name, (KyberPublicKeyParameters) pair.getPublic());
        studentPrivKeys.put(name, (KyberPrivateKeyParameters) pair.getPrivate());
    }

    public Set<String> getStudentNames() {
        return studentPubKeys.keySet();
    }

    public KyberPublicKeyParameters getStudentPublicKey(String name) {
        return studentPubKeys.get(name);
    }

    public KyberPrivateKeyParameters getStudentPrivateKey(String name) {
        return studentPrivKeys.get(name);
    }

    public synchronized Map<String, Object> issueCertificate(CertificateData cert) throws Exception {
        byte[] certBytes = CertUtils.toCanonicalBytes(cert);
        byte[] signature = dilithiumService.sign(certBytes, uniPrivateKey);
        String id = UUID.randomUUID().toString();

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("id", id);
        entry.put("certificate", Map.of(
            "student", cert.student(),
            "course", cert.course(),
            "grade", cert.grade(),
            "date", cert.date()
        ));
        entry.put("signature", Hex.toHexString(signature));
        entry.put("status", "issued");
        entry.put("student", cert.student());
        issuedCertificates.add(entry);

        return entry;
    }

    public boolean verifyCertificate(CertificateData cert, byte[] signature) throws Exception {
        byte[] certBytes = CertUtils.toCanonicalBytes(cert);
        return dilithiumService.verify(certBytes, signature, uniPublicKey);
    }

    public List<Map<String, Object>> getAllCertificates() {
        return List.copyOf(issuedCertificates);
    }

    public synchronized Map<String, Object> deliverCertificate(String certId, String studentName) throws Exception {
        Map<String, Object> found = null;
        for (Map<String, Object> cert : issuedCertificates) {
            if (cert.get("id").equals(certId) && "issued".equals(cert.get("status"))) {
                found = cert;
                break;
            }
        }
        if (found == null) throw new IllegalArgumentException("Certificado no encontrado o ya entregado");

        @SuppressWarnings("unchecked")
        CertificateData data = CertUtils.fromMap((Map<String, Object>) found.get("certificate"));
        if (!data.student().equals(studentName)) {
            throw new IllegalArgumentException("El certificado pertenece a " + data.student() + ", no a " + studentName);
        }

        EncryptedPayload payload = encryptForStudent(studentName, data);
        byte[] signature = Hex.decodeStrict((String) found.get("signature"));

        Map<String, Object> inboxItem = new LinkedHashMap<>();
        inboxItem.put("id", certId);
        inboxItem.put("certificate", found.get("certificate"));
        inboxItem.put("signature", Hex.toHexString(signature));
        inboxItem.put("ciphertext", Hex.toHexString(payload.ciphertext()));
        inboxItem.put("iv", Hex.toHexString(payload.iv()));
        inboxItem.put("encryptedData", Hex.toHexString(payload.encryptedData()));
        inboxItem.put("status", "delivered");

        inboxes.computeIfAbsent(studentName, k -> new ArrayList<>()).add(inboxItem);
        found.put("status", "delivered");

        return inboxItem;
    }

    public List<Map<String, Object>> getInbox(String studentName) {
        return List.copyOf(inboxes.getOrDefault(studentName, List.of()));
    }

    public Map<String, Object> receiveFromInbox(String certId, String studentName) throws Exception {
        List<Map<String, Object>> inbox = inboxes.get(studentName);
        if (inbox == null) throw new IllegalArgumentException("Bandeja vacía");

        Map<String, Object> found = null;
        for (Map<String, Object> item : inbox) {
            if (item.get("id").equals(certId)) {
                found = item;
                break;
            }
        }
        if (found == null) throw new IllegalArgumentException("Certificado no encontrado en bandeja");

        byte[] ciphertext = Hex.decodeStrict((String) found.get("ciphertext"));
        byte[] iv = Hex.decodeStrict((String) found.get("iv"));
        byte[] encryptedData = Hex.decodeStrict((String) found.get("encryptedData"));
        byte[] signature = Hex.decodeStrict((String) found.get("signature"));

        EncryptedPayload payload = new EncryptedPayload(ciphertext, iv, encryptedData);
        byte[] decryptedBytes = decryptForStudent(studentName, payload);

        @SuppressWarnings("unchecked")
        CertificateData cert = CertUtils.fromMap((Map<String, Object>) found.get("certificate"));
        boolean valid = verifyCertificate(cert, signature);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("certificate", found.get("certificate"));
        result.put("signature", found.get("signature"));
        result.put("valid", valid);
        return result;
    }

    public EncryptedPayload encryptForStudent(String studentName, CertificateData cert) throws Exception {
        KyberPublicKeyParameters pubKey = studentPubKeys.get(studentName);
        if (pubKey == null) throw new IllegalArgumentException("Student not found: " + studentName);
        byte[] certBytes = CertUtils.toCanonicalBytes(cert);
        return kyberService.encrypt(certBytes, pubKey);
    }

    public byte[] decryptForStudent(String studentName, EncryptedPayload payload) throws Exception {
        KyberPrivateKeyParameters privKey = studentPrivKeys.get(studentName);
        if (privKey == null) throw new IllegalArgumentException("Student not found: " + studentName);
        return kyberService.decrypt(payload, privKey);
    }

    // ===== Simulation helpers (Lab 2) =====

    public void swapStudentPublicKey(String name, KyberPublicKeyParameters newPubKey) {
        studentPubKeys.put(name, newPubKey);
    }

    public void restoreStudentKeys(String name, KyberPublicKeyParameters pubKey, KyberPrivateKeyParameters privKey) {
        studentPubKeys.put(name, pubKey);
        studentPrivKeys.put(name, privKey);
    }

    public void updateInboxItem(String studentName, String itemId, Map<String, Object> updated) {
        List<Map<String, Object>> inbox = inboxes.get(studentName);
        if (inbox == null) return;
        for (int i = 0; i < inbox.size(); i++) {
            if (inbox.get(i).get("id").equals(itemId)) {
                inbox.set(i, updated);
                return;
            }
        }
    }
}
