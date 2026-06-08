package com.test.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AplicacionDemo {

	public static void main(String[] args) {
		SpringApplication.run(AplicacionDemo.class, args);
	}

}
