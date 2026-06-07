package com.test.demo.config;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;
import java.security.Security;

@Configuration
public class ConfiguracionBouncyCastle {

    @PostConstruct
    public void init() {
        Security.addProvider(new BouncyCastleProvider());
    }
}
