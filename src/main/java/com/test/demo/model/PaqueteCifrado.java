package com.test.demo.model;

public record PaqueteCifrado(
    byte[] textoCifrado,
    byte[] iv,
    byte[] datosCifrados
) {}
