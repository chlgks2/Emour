package com.ssafy.emour;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EmourApplication {

	public static void main(String[] args) {
		SpringApplication.run(EmourApplication.class, args);
	}

}
