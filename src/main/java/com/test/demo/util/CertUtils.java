package com.test.demo.util;

import com.test.demo.model.CertificateData;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.TreeMap;

public class CertUtils {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static byte[] toCanonicalBytes(CertificateData cert) throws Exception {
        TreeMap<String, Object> sorted = new TreeMap<>();
        sorted.put("course", cert.course());
        sorted.put("date", cert.date());
        sorted.put("grade", cert.grade());
        sorted.put("student", cert.student());
        return MAPPER.writeValueAsBytes(sorted);
    }

    public static CertificateData fromMap(Map<String, Object> map) {
        return MAPPER.convertValue(map, CertificateData.class);
    }
}
