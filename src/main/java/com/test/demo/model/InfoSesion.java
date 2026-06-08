package com.test.demo.model;

import java.time.Instant;

public record InfoSesion(
    byte[] sessionKey,
    Instant creadaEn,
    Instant ultimoUso
) {
    public InfoSesion(byte[] sessionKey) {
        this(sessionKey, Instant.now(), Instant.now());
    }

    public InfoSesion renovar() {
        return new InfoSesion(sessionKey, creadaEn, Instant.now());
    }

    public boolean estaExpirada(long ttlSegundos) {
        return Instant.now().isAfter(ultimoUso.plusSeconds(ttlSegundos));
    }
}
