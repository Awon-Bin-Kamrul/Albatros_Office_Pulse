# Office Pulse - Team Albatros

A real-time, IoT-based office environment monitoring and automation system designed to enhance energy efficiency.

---

## 📑 Table of Contents
- [Demo Video](#-demo-video)
- [Live Dashboard](#-live-dashboard)
- [Discord Community & Alerts](#-discord-community--alerts)
- [Project Overview](#-project-overview)
- [System Architecture](#-system-architecture)
- [Hardware Simulation](#-hardware-simulation)
- [Tech Stack](#-tech-stack)
- [Team Members](#-team-members)
- [License](#-license)

---

## 🎥 Demo Video
Watch our 3-minute demo video to see Office Pulse in action:
🔗 [Link to Office Pulse Demo Video](https://drive.google.com/drive/folders/1wwcdFNymNAJQDWpNSRzUPkFfk0mIvtV2)

## 🌐 Live Dashboard
Experience the real-time monitoring interface here:
🔗 [Office Pulse Live Dashboard](https://albatros-office-pulse.vercel.app/)
*Our dashboard provides a centralized, responsive interface for tracking device states, analyzing energy consumption patterns, and managing office automation settings on the fly.*

## 🤖 Discord Community & Alerts
Stay updated with real-time office notifications and join our community:
🔗 [Join Office Pulse Discord Server](https://discord.gg/xhZ4SPUW)
*Receive instant automated alerts via our bot, **Captain ASR**, whenever there is critical activity in the office.*

---

## 💡 Project Overview
Modern offices often suffer from significant energy waste due to lights, fans, and other devices being left on after hours or in unoccupied rooms. Office Pulse provides a smart, scalable solution to this problem. Our system remotely monitors office device status and power consumption in real-time, allowing for automated alerts and remote management.

**Key features include:**
* **Real-time Monitoring:** Live dashboard showing device status (lights, fans) and energy usage.
* **Automated Alerts:** Instant notifications via a Discord bot for after-hours device activity.
* **Scalable Architecture:** Modular design suitable for small offices and large enterprises.

## 🏗️ System Architecture
The Office Pulse system is built on a robust, event-driven architecture that ensures seamless communication between hardware and the user interface.

[System Architecture Diagram](https://drive.google.com/drive/folders/1a4KDCPGbuNs9XeBt8IUy7LqdqIqRwOSi?usp=sharing)

**The data flow is as follows:**
1. **IoT Hardware Node (Wokwi):** Simulates office appliances (LEDs and Relays) using an ESP32. It posts state updates to the cloud.
2. **Cloud Backend:** A serverless, PostgreSQL-based backend that processes and stores the incoming data, managing device states and alert rules.
3. **Frontend Dashboard:** A modern web interface built with React and TanStack Start that subscribes to real-time database changes.
4. **Discord Bot (Captain ASR):** An automated bot that receives triggers from the backend to send real-time alerts.

## ⚙️ Hardware Simulation
We use Wokwi for hardware validation, allowing us to simulate the physical setup without needing actual hardware.

🔗 [Link to Wokwi Simulation: Office Pulse](https://wokwi.com/projects/468604243748749313)

**Simulation Setup:**
* **Microcontroller:** ESP32 DevKit V1
* **Actuators:** 3x LEDs (lights), 2x Relay Modules (fans/HVAC)
* **Inputs:** Push buttons to toggle device states.

## 🛠️ Tech Stack
* **Hardware Simulation:** Wokwi (ESP32, LEDs, Relays)
* **Firmware:** C++ (Arduino framework)
* **Backend:** Serverless PostgreSQL-based backend.
* **Frontend:** React 19, TanStack Start, Tailwind CSS.
* **Database:** PostgreSQL (with real-time subscriptions).
* **Alerts:** Discord API (Edge functions).

---

## 👥 Team Members
* [Add Team Member Names Here]

## 📜 License
This project is licensed under the [MIT License](LICENSE).
