-- AyniSalud | MySQL 8.0+ | Modelo entregado + bitacora de guardia (RF07).
-- EJECUTAR en MySQL Workbench con un usuario con permisos para crear BD.
CREATE DATABASE IF NOT EXISTS aynisalud_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aynisalud_db;

CREATE TABLE IF NOT EXISTS roles (
 id_rol INT PRIMARY KEY AUTO_INCREMENT,
 nombre_rol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
 id_usuario INT PRIMARY KEY AUTO_INCREMENT,
 id_rol INT NOT NULL,
 nombre_completo VARCHAR(150) NOT NULL,
 correo VARCHAR(100) NOT NULL UNIQUE,
 contrasena_hash VARCHAR(255) NOT NULL,
 telefono VARCHAR(20),
 estado BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS residentes (
 id_residente INT PRIMARY KEY AUTO_INCREMENT,
 id_familiar_tutor INT NULL,
 nombres VARCHAR(100) NOT NULL,
 apellidos VARCHAR(100) NOT NULL,
 fecha_nacimiento DATE NOT NULL,
 numero_habitacion VARCHAR(20) NOT NULL,
 alergias TEXT,
 condiciones_medicas TEXT,
 fecha_ingreso DATE NOT NULL,
 estado BOOLEAN NOT NULL DEFAULT TRUE,
 INDEX idx_residente_tutor (id_familiar_tutor),
 CONSTRAINT fk_residente_tutor FOREIGN KEY (id_familiar_tutor) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS farmacos (
 id_farmaco INT PRIMARY KEY AUTO_INCREMENT,
 nombre_comercial VARCHAR(150) NOT NULL,
 principio_activo VARCHAR(150) NOT NULL,
 presentacion VARCHAR(50) NOT NULL,
 stock_disponible INT NOT NULL DEFAULT 0,
 CONSTRAINT chk_stock CHECK (stock_disponible >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS esquemas_medicacion (
 id_esquema INT PRIMARY KEY AUTO_INCREMENT,
 id_residente INT NOT NULL,
 id_farmaco INT NOT NULL,
 dosis VARCHAR(50) NOT NULL,
 via_administracion VARCHAR(50) NOT NULL,
 frecuencia_horas INT NOT NULL,
 hora_inicio TIME NOT NULL,
 fecha_inicio DATE NOT NULL,
 fecha_fin DATE NOT NULL,
 INDEX idx_esquema_residente (id_residente),
 CONSTRAINT chk_frecuencia CHECK (frecuencia_horas BETWEEN 1 AND 168),
 CONSTRAINT chk_fechas CHECK (fecha_fin >= fecha_inicio),
 CONSTRAINT fk_esquema_residente FOREIGN KEY (id_residente) REFERENCES residentes(id_residente),
 CONSTRAINT fk_esquema_farmaco FOREIGN KEY (id_farmaco) REFERENCES farmacos(id_farmaco)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS registros_medicacion (
 id_registro_med INT PRIMARY KEY AUTO_INCREMENT,
 id_esquema INT NOT NULL,
 id_enfermero INT NOT NULL,
 fecha_programada DATETIME NOT NULL,
 fecha_administrada DATETIME NULL,
 estado_alerta VARCHAR(50) NOT NULL,
 observaciones TEXT,
 UNIQUE KEY uq_dosis_programada (id_esquema, fecha_programada),
 INDEX idx_medicacion_fecha (fecha_programada),
 CONSTRAINT fk_reg_med_esquema FOREIGN KEY (id_esquema) REFERENCES esquemas_medicacion(id_esquema),
 CONSTRAINT fk_reg_med_enfermero FOREIGN KEY (id_enfermero) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS registros_alimentacion (
 id_registro_ali INT PRIMARY KEY AUTO_INCREMENT,
 id_residente INT NOT NULL,
 id_cuidador INT NOT NULL,
 tipo_comida VARCHAR(50) NOT NULL,
 tipo_dieta VARCHAR(100) NOT NULL,
 fecha_hora_programada DATETIME NOT NULL,
 fecha_hora_entregada DATETIME NULL,
 estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
 INDEX idx_alimentacion_fecha (fecha_hora_programada),
 INDEX idx_alimentacion_residente (id_residente),
 CONSTRAINT fk_ali_residente FOREIGN KEY (id_residente) REFERENCES residentes(id_residente),
 CONSTRAINT fk_ali_cuidador FOREIGN KEY (id_cuidador) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS signos_vitales (
 id_signo INT PRIMARY KEY AUTO_INCREMENT,
 id_residente INT NOT NULL,
 id_enfermero INT NOT NULL,
 presion_arterial VARCHAR(20) NOT NULL,
 frecuencia_cardiaca INT NOT NULL,
 saturacion_oxigeno INT NOT NULL,
 glucemia INT NOT NULL,
 fecha_registro DATETIME NOT NULL,
 INDEX idx_signos_residente_fecha (id_residente, fecha_registro),
 CONSTRAINT fk_signos_residente FOREIGN KEY (id_residente) REFERENCES residentes(id_residente),
 CONSTRAINT fk_signos_enfermero FOREIGN KEY (id_enfermero) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Extensión respecto al diagrama de tu compañero: el documento exige RF07.
CREATE TABLE IF NOT EXISTS bitacoras_guardia (
 id_bitacora INT PRIMARY KEY AUTO_INCREMENT,
 id_usuario INT NOT NULL,
 id_residente INT NULL,
 turno ENUM('Manana','Tarde','Noche') NOT NULL,
 nota TEXT NOT NULL,
 fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_bitacora_fecha (fecha_registro),
 CONSTRAINT fk_bit_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
 CONSTRAINT fk_bit_residente FOREIGN KEY (id_residente) REFERENCES residentes(id_residente)
) ENGINE=InnoDB;
