package com.test.demo.model;

import org.bouncycastle.pqc.crypto.crystals.kyber.KyberPrivateKeyParameters;
import java.time.Instant;

public record HandshakePendiente(
    KyberPrivateKeyParameters skKem,
    byte[] serverNonce,
    Instant creadaEn
) {
    public boolean estaExpirada() {
        return Instant.now().isAfter(creadaEn.plusSeconds(30));
    }
}
