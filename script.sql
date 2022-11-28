-- Adminer 4.8.1 MySQL 5.5.5-10.6.11-MariaDB-1:10.6.11+maria~deb11 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS `jacekkocek`;
CREATE DATABASE `jacekkocek` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `jacekkocek`;

DROP TABLE IF EXISTS `Films`;
CREATE TABLE `Films` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `suggested_by` varchar(18) DEFAULT NULL,
  `watched` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=223 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `KinoEvent`;
CREATE TABLE `KinoEvent` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `film` int(11) DEFAULT NULL,
  `date_poll` int(11) DEFAULT NULL,
  `film_poll` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `date_locked` tinyint(4) DEFAULT NULL,
  `watched` tinyint(4) DEFAULT NULL,
  `lock_message_id` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `film` (`film`),
  CONSTRAINT `KinoEvent_ibfk_2` FOREIGN KEY (`film`) REFERENCES `Films` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `Policies`;
CREATE TABLE `Policies` (
  `name` varchar(64) NOT NULL,
  `value` double NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `PollOptions`;
CREATE TABLE `PollOptions` (
  `index` int(11) NOT NULL,
  `poll` int(11) NOT NULL,
  `name` varchar(250) NOT NULL,
  PRIMARY KEY (`poll`,`index`),
  CONSTRAINT `PollOptions_ibfk_1` FOREIGN KEY (`poll`) REFERENCES `Polls` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `Polls`;
CREATE TABLE `Polls` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` varchar(64) NOT NULL,
  `name` varchar(250) DEFAULT NULL,
  `last_interacted` date DEFAULT NULL,
  `max_votes_per_user` int(11) DEFAULT 0,
  `custom_options_allowed` tinyint(4) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `PollVotes`;
CREATE TABLE `PollVotes` (
  `user` varchar(18) NOT NULL,
  `poll` int(11) NOT NULL,
  `option_index` int(11) NOT NULL,
  PRIMARY KEY (`poll`,`option_index`,`user`),
  CONSTRAINT `PollVotes_ibfk_3` FOREIGN KEY (`poll`, `option_index`) REFERENCES `PollOptions` (`poll`, `index`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PollVotes_ibfk_5` FOREIGN KEY (`poll`) REFERENCES `Polls` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
  `id` varchar(18) NOT NULL,
  `matoshi` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `Wallet`;
CREATE TABLE `Wallet` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(18) NOT NULL,
  `currency` varchar(4) NOT NULL,
  `amount` double NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_currency` (`user`,`currency`),
  CONSTRAINT `Wallet_ibfk_1` FOREIGN KEY (`user`) REFERENCES `Users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=567 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- 2022-11-28 20:20:23