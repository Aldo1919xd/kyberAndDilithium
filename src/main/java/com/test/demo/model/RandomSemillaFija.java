package com.test.demo.model;

import java.security.SecureRandom;
import java.util.Random;

public class RandomSemillaFija extends SecureRandom {

    private static final long serialVersionUID = 1L;
    private final Random fixed;

    public RandomSemillaFija(long seed) {
        this.fixed = new Random(seed);
    }

    @Override
    public String getAlgorithm() {
        return "FIJA";
    }

    @Override
    public synchronized void nextBytes(byte[] bytes) {
        fixed.nextBytes(bytes);
    }

    @Override
    public byte[] generateSeed(int numBytes) {
        byte[] b = new byte[numBytes];
        fixed.nextBytes(b);
        return b;
    }

    @Override
    public void setSeed(byte[] seed) {}

    @Override
    public void setSeed(long seed) {}
}
