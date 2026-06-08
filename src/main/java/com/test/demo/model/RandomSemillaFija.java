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
    public int nextInt() {
        return fixed.nextInt();
    }

    @Override
    public int nextInt(int bound) {
        return fixed.nextInt(bound);
    }

    @Override
    public long nextLong() {
        return fixed.nextLong();
    }

    @Override
    public float nextFloat() {
        return fixed.nextFloat();
    }

    @Override
    public double nextDouble() {
        return fixed.nextDouble();
    }

    @Override
    public synchronized double nextGaussian() {
        return fixed.nextGaussian();
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
