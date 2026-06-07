package com.test.demo.model;

public record EncryptedPayload(
    byte[] ciphertext,
    byte[] iv,
    byte[] encryptedData
) {}
