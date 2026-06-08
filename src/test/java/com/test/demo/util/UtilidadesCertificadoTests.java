package com.test.demo.util;

import com.test.demo.model.DatosCertificado;
import org.junit.jupiter.api.Test;
import java.util.LinkedHashMap;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class UtilidadesCertificadoTests {

    @Test
    void aBytesCanonicos_ordenAlfabetico() throws Exception {
        DatosCertificado cert = new DatosCertificado("Alice", "Matematicas", 95, "2025-06-01");
        byte[] bytes = UtilidadesCertificado.aBytesCanonicos(cert);
        String json = new String(bytes);
        assertTrue(json.contains("\"curso\""));
        assertTrue(json.contains("\"fecha\""));
        assertTrue(json.contains("\"nota\""));
        assertTrue(json.contains("\"estudiante\""));
        int idxCurso = json.indexOf("\"curso\"");
        int idxNota = json.indexOf("\"nota\"");
        assertTrue(idxCurso < idxNota, "curso debe ir antes que nota alfabeticamente");
    }

    @Test
    void desdeMapa_roundtrip() throws Exception {
        DatosCertificado original = new DatosCertificado("Bob", "Fisica", 88, "2025-06-15");
        byte[] bytes = UtilidadesCertificado.aBytesCanonicos(original);
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("estudiante", "Bob");
        mapa.put("curso", "Fisica");
        mapa.put("nota", 88);
        mapa.put("fecha", "2025-06-15");
        DatosCertificado reconstruido = UtilidadesCertificado.desdeMapa(mapa);
        assertEquals(original, reconstruido);
    }

    @Test
    void desdeBytes_roundtrip() throws Exception {
        DatosCertificado original = new DatosCertificado("Charlie", "Quimica", 92, "2025-07-01");
        byte[] bytes = UtilidadesCertificado.aBytesCanonicos(original);
        DatosCertificado desdeBytes = UtilidadesCertificado.desdeBytes(bytes);
        assertEquals(original, desdeBytes);
    }

    @Test
    void aBytesCanonicos_esConsistente() throws Exception {
        DatosCertificado cert = new DatosCertificado("Alice", "Matematicas", 95, "2025-06-01");
        byte[] b1 = UtilidadesCertificado.aBytesCanonicos(cert);
        byte[] b2 = UtilidadesCertificado.aBytesCanonicos(cert);
        assertArrayEquals(b1, b2);
    }
}
