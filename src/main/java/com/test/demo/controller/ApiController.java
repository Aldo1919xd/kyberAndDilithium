package com.test.demo.controller;

import com.test.demo.model.CertificateData;
import com.test.demo.model.FixedRandom;
import com.test.demo.service.SimulationService;
import com.test.demo.service.UniversityService;
import com.test.demo.util.CertUtils;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final UniversityService uniService;
    private final SimulationService simService;

    public ApiController(UniversityService uniService, SimulationService simService) {
        this.uniService = uniService;
        this.simService = simService;
    }

    // ===== University =====
    @GetMapping("/uni/status")
    public Map<String, Object> universityStatus() {
        return Map.of(
            "initialized", uniService.isInitialized(),
            "publicKey", uniService.isInitialized()
                ? Hex.toHexString(uniService.getUniPublicKeyEncoded()) : ""
        );
    }

    @PostMapping("/student/create")
    public Map<String, Object> createStudent(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return Map.of("success", false, "error", "El nombre es obligatorio");
        }
        uniService.createStudent(name);
        return Map.of("success", true, "name", name);
    }

    @GetMapping("/students")
    public Map<String, Object> getStudents() {
        return Map.of("students", uniService.getStudentNames());
    }

    @PostMapping("/certificate/issue")
    public Map<String, Object> issueCertificate(@RequestBody CertificateData cert) throws Exception {
        Map<String, Object> issued = uniService.issueCertificate(cert);
        return Map.of("success", true, "certificate", issued);
    }

    @GetMapping("/certificates")
    public Map<String, Object> listCertificates() {
        return Map.of("certificates", uniService.getAllCertificates());
    }

    @PostMapping("/certificates/deliver")
    public Map<String, Object> deliverCertificate(@RequestBody Map<String, String> body) throws Exception {
        String certId = body.get("certId");
        String studentName = body.get("studentName");
        if (certId == null || studentName == null) {
            return Map.of("success", false, "error", "Faltan parámetros");
        }
        try {
            Map<String, Object> delivered = uniService.deliverCertificate(certId, studentName);
            return Map.of("success", true, "delivery", delivered);
        } catch (IllegalArgumentException e) {
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    @GetMapping("/certificates/inbox/{name}")
    public Map<String, Object> getInbox(@PathVariable String name) {
        return Map.of("inbox", uniService.getInbox(name));
    }

    @PostMapping("/certificates/receive")
    public Map<String, Object> receiveCertificate(@RequestBody Map<String, String> body) throws Exception {
        String certId = body.get("certId");
        String studentName = body.get("studentName");
        if (certId == null || studentName == null) {
            return Map.of("success", false, "error", "Faltan parámetros");
        }
        try {
            Map<String, Object> result = uniService.receiveFromInbox(certId, studentName);
            result.put("success", true);
            return result;
        } catch (IllegalArgumentException e) {
            return Map.of("success", false, "error", e.getMessage());
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "error", "No se pudo descifrar este certificado con la identidad seleccionada. Si el Lab MITM esta activo, restaura y reenvia antes de abrirlo."
            );
        }
    }

    // ===================== LABS =====================

    // ===== LAB 1: Weak RNG =====
    @PostMapping("/labs/1/activate-weak-rng")
    public Map<String, Object> activateWeakRng() {
        simService.setWeakRng(true);
        // Re-init university with weak RNG
        FixedRandom fr = simService.getFixedRandom();
        // We need to re-init the university - use the weak random
        // Since UniversityService.initUniversity() internally uses dilithiumService.generateKeyPair()
        // which uses the internal secureRandom, we need to override at the service level
        // For simplicity, we expose a special init method
        uniService.initWithRandom(fr);
        return Map.of("success", true, "message", "RNG débil activado. La universidad se re-inicializó con semilla fija 12345.");
    }

    @GetMapping("/labs/1/status")
    public Map<String, Object> lab1Status() {
        return Map.of("weakRngActive", simService.isWeakRngActive());
    }

    @PostMapping("/labs/1/extract-key")
    public Map<String, Object> extractKey() {
        return simService.extractPrivateKey();
    }

    @PostMapping("/labs/1/forge")
    public Map<String, Object> forgeFake(@RequestBody CertificateData cert) throws Exception {
        return simService.forgeFakeCert(cert);
    }

    // ===== LAB 2: MITM Kyber =====
    @PostMapping("/labs/2/intercept/{student}")
    public Map<String, Object> intercept(@PathVariable String student) throws Exception {
        try {
            return simService.interceptStudent(student);
        } catch (IllegalArgumentException e) {
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    @GetMapping("/labs/2/status/{student}")
    public Map<String, Object> lab2Status(@PathVariable String student) {
        return Map.of("intercepted", simService.isIntercepted(student));
    }

    @PostMapping("/labs/2/read/{student}")
    public Map<String, Object> malloryRead(@PathVariable String student) throws Exception {
        try {
            return simService.malloryReadInbox(student);
        } catch (IllegalArgumentException e) {
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    @PostMapping("/labs/2/restore/{student}")
    public Map<String, Object> restoreAndForward(@PathVariable String student) throws Exception {
        try {
            return simService.restoreAndForward(student);
        } catch (IllegalArgumentException e) {
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    // ===== LAB 3: Fake Identity =====
    @PostMapping("/labs/3/create-fake")
    public Map<String, Object> createFakeIdentity() {
        return simService.createFakeIdentity();
    }

    @GetMapping("/labs/3/fake-key")
    public Map<String, Object> getFakeKey() {
        return simService.getFakeIdentity();
    }

    @PostMapping("/labs/3/sign")
    public Map<String, Object> signFake(@RequestBody CertificateData cert) throws Exception {
        return simService.signWithFakeIdentity(cert);
    }
}
