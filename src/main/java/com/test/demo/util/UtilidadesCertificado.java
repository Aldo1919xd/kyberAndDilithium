package com.test.demo.util;

import com.test.demo.model.DatosCertificado;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.TreeMap;

public class UtilidadesCertificado {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static byte[] aBytesCanonicos(DatosCertificado cert) throws Exception {
        TreeMap<String, Object> sorted = new TreeMap<>();
        sorted.put("curso", cert.curso());
        sorted.put("fecha", cert.fecha());
        sorted.put("nota", cert.nota());
        sorted.put("estudiante", cert.estudiante());
        return MAPPER.writeValueAsBytes(sorted);
    }

    public static DatosCertificado desdeMapa(Map<String, Object> map) {
        return MAPPER.convertValue(map, DatosCertificado.class);
    }

    public static DatosCertificado desdeBytes(byte[] bytes) throws Exception {
        return MAPPER.readValue(bytes, DatosCertificado.class);
    }
}
