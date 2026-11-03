-- ========================================================
-- DBMS Bus Ticket Booking & Route Management System
-- Database Schema & Sample Data
-- ========================================================

CREATE DATABASE IF NOT EXISTS `bus_booking`;
USE `bus_booking`;

-- 1. Operators
CREATE TABLE IF NOT EXISTS `operators` (
  `operator_id` INT NOT NULL AUTO_INCREMENT,
  `operator_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `operators` (`operator_id`, `operator_name`) VALUES
(1, 'KSRTC'),
(2, 'GreenLine Travels')
ON DUPLICATE KEY UPDATE `operator_name`=VALUES(`operator_name`);

-- 2. Buses
CREATE TABLE IF NOT EXISTS `buses` (
  `bus_id` INT NOT NULL AUTO_INCREMENT,
  `bus_name` VARCHAR(100) NOT NULL,
  `bus_type` VARCHAR(50) DEFAULT NULL,
  `total_seats` INT NOT NULL,
  `operator_id` INT DEFAULT NULL,
  PRIMARY KEY (`bus_id`),
  KEY `operator_id` (`operator_id`),
  CONSTRAINT `buses_ibfk_1` FOREIGN KEY (`operator_id`) REFERENCES `operators` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `buses` (`bus_id`, `bus_name`, `bus_type`, `total_seats`, `operator_id`) VALUES
(1, 'Airavat Express', 'AC Sleeper', 20, 1),
(2, 'GreenLine Volvo', 'AC Seater', 20, 2),
(3, 'Royal Travels', 'Non AC Sleeper', 20, 1)
ON DUPLICATE KEY UPDATE `bus_name`=VALUES(`bus_name`), `total_seats`=VALUES(`total_seats`);

-- 3. Routes
CREATE TABLE IF NOT EXISTS `routes` (
  `route_id` INT NOT NULL AUTO_INCREMENT,
  `source` VARCHAR(100) NOT NULL,
  `destination` VARCHAR(100) NOT NULL,
  `distance_km` DECIMAL(8,2) DEFAULT NULL,
  PRIMARY KEY (`route_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `routes` (`route_id`, `source`, `destination`, `distance_km`) VALUES
(1, 'Bangalore', 'Mysore', 145.00),
(2, 'Bangalore', 'Chennai', 350.00),
(3, 'Mysore', 'Mangalore', 255.00),
(4, 'Mysore', 'Bangalore', 145.00),
(5, 'Chennai', 'Bangalore', 350.00),
(6, 'Mangalore', 'Mysore', 255.00)
ON DUPLICATE KEY UPDATE `source`=VALUES(`source`), `destination`=VALUES(`destination`);

-- 4. Seats (20 seats per bus)
CREATE TABLE IF NOT EXISTS `seats` (
  `seat_id` INT NOT NULL AUTO_INCREMENT,
  `bus_id` INT NOT NULL,
  `seat_number` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`seat_id`),
  UNIQUE KEY `bus_id` (`bus_id`,`seat_number`),
  CONSTRAINT `seats_ibfk_1` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`bus_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Schedules
CREATE TABLE IF NOT EXISTS `schedules` (
  `schedule_id` INT NOT NULL AUTO_INCREMENT,
  `bus_id` INT NOT NULL,
  `route_id` INT NOT NULL,
  `travel_date` DATE NOT NULL,
  `departure_time` TIME DEFAULT NULL,
  `arrival_time` TIME DEFAULT NULL,
  `fare` DECIMAL(10,2) DEFAULT NULL,
  PRIMARY KEY (`schedule_id`),
  KEY `bus_id` (`bus_id`),
  KEY `route_id` (`route_id`),
  CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`bus_id`),
  CONSTRAINT `schedules_ibfk_2` FOREIGN KEY (`route_id`) REFERENCES `routes` (`route_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Passengers
CREATE TABLE IF NOT EXISTS `passengers` (
  `passenger_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(15) DEFAULT NULL,
  PRIMARY KEY (`passenger_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Bookings
CREATE TABLE IF NOT EXISTS `bookings` (
  `booking_id` INT NOT NULL AUTO_INCREMENT,
  `passenger_id` INT NOT NULL,
  `schedule_id` INT NOT NULL,
  `booking_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `booking_status` VARCHAR(20) DEFAULT 'CONFIRMED',
  PRIMARY KEY (`booking_id`),
  KEY `passenger_id` (`passenger_id`),
  KEY `schedule_id` (`schedule_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`passenger_id`) REFERENCES `passengers` (`passenger_id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`schedule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Booking Seats
CREATE TABLE IF NOT EXISTS `booking_seats` (
  `booking_seat_id` INT NOT NULL AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `schedule_id` INT NOT NULL,
  `seat_id` INT NOT NULL,
  PRIMARY KEY (`booking_seat_id`),
  UNIQUE KEY `unique_schedule_seat` (`schedule_id`,`seat_id`),
  KEY `booking_id` (`booking_id`),
  KEY `seat_id` (`seat_id`),
  CONSTRAINT `booking_seats_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  CONSTRAINT `booking_seats_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`schedule_id`),
  CONSTRAINT `booking_seats_ibfk_3` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Payments
CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id` INT NOT NULL AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `payment_amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(30) DEFAULT NULL,
  `payment_status` VARCHAR(20) DEFAULT NULL,
  `payment_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
