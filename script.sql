-- Adminer 4.8.1 MySQL 5.5.5-10.5.15-MariaDB-1:10.5.15+maria~buster dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS `jacekkocek`;
CREATE DATABASE `jacekkocek` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;
USE `jacekkocek`;

DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
  `id` varchar(18) NOT NULL,
  `matoshi` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS `Wallet`;
CREATE TABLE `Wallet` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(18) NOT NULL,
  `currency` varchar(4) NOT NULL,
  `amount` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user` (`user`),
  CONSTRAINT `Wallet_ibfk_1` FOREIGN KEY (`user`) REFERENCES `Users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 2022-03-20 00:01:35