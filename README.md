# 🌍 Local Services Marketplace (MERN)

A **full-stack MERN application** that connects customers with verified local service providers through a **real-time, location-based booking system**.

This platform ensures **secure transactions, live tracking, real-time communication, and verified professionals**, making it a reliable marketplace for local services.

---

## 🚀 Project Title

**Nearby Services Finder with Real-Time Booking System**

---

## 📌 Overview

The **Local Services Marketplace** is designed to bridge the gap between customers and nearby professionals such as electricians, plumbers, cleaners, and more.

It provides a **map-based discovery system**, **instant booking**, **live chat**, and **secure payments**, ensuring a seamless service experience.

---

## 🔄 Core Workflow

1. **User Registration**

   * Users sign up as **Customer** or **Service Provider**

2. **Provider Verification**

   * Admin verifies documents before activation

3. **Service Discovery**

   * Customers search nearby services using geolocation

4. **Booking & Communication**

   * Real-time booking with chat support

5. **Service Execution**

   * Live tracking and job status updates

6. **Payment & Feedback**

   * Secure payment + review system

---

## 👥 Modules

### 👤 Customer Module

* Search nearby services using **geolocation**
* Book services in real-time
* Track service status
* Chat with providers
* Secure online payments
* View booking history

---

### 🧑‍🔧 Service Provider Module

* Register and create profile
* Upload verification documents
* Manage services and pricing
* Accept/reject bookings
* Track earnings dashboard

---

### 🛠️ Admin Module

* Verify providers
* Manage users & services
* Monitor bookings
* Handle disputes
* Track platform revenue

---

## ⚙️ Tech Stack

### 💻 Frontend

* React.js
* Leaflet.js (Maps)
* Socket.io-client

### 🖥️ Backend

* Node.js
* Express.js
* MongoDB (Mongoose)

### 🔐 Security & Tools

* JWT Authentication
* Bcrypt (Password hashing)
* Express Validator
* Multer (File uploads)

### 💳 Payments

* Razorpay Integration

---

## 📍 Key Features

* 🌐 **Geolocation-based service discovery**
* ⚡ **Real-time booking system**
* 💬 **Live chat (Socket.io)**
* 📡 **Live tracking of providers**
* 🔐 **Secure authentication (JWT)**
* 📂 **Document verification system**
* ⭐ **Review & rating system**
* 💰 **Commission & revenue tracking**

---

## 🧠 How Nearby Search Works

* Uses **MongoDB 2dsphere index**
* `$geoNear` aggregation finds nearby providers
* Filters by:

  * Distance
  * Category
  * Availability
* Returns sorted results by nearest location

---

## 📂 Project Structure

```
/client        → React frontend
/server        → Node.js backend
/controllers   → Business logic
/models        → MongoDB schemas
/routes        → API routes
/middleware    → Auth & validation
```

---

## 🔧 Installation & Setup

### 1️⃣ Clone Repository

```
git clone https://github.com/your-username/local-services-marketplace-mern.git
cd local-services-marketplace-mern
```

### 2️⃣ Install Dependencies

```
cd server
npm install

cd ../client
npm install
```

---

### 3️⃣ Environment Variables

Create `.env` file inside **server folder**

```
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

---

### 4️⃣ Run Project

```
# Run backend
cd server
npm run dev

# Run frontend
cd client
npm start
```

---

## 📊 Features Breakdown

| Feature         | Description             |
| --------------- | ----------------------- |
| Real-Time Chat  | Socket.io communication |
| Location Search | MongoDB Geo Queries     |
| Payments        | Razorpay integration    |
| Authentication  | JWT-based login         |
| File Upload     | Multer middleware       |

---

## 📸 Screenshots (Add these)

* Home Page
* Map View (Nearby Services)
* Booking Page
* Chat Interface
* Admin Dashboard

---

## 🧪 Future Enhancements

* AI-based service recommendations
* Mobile app (React Native)
* Subscription plans
* Multi-language support
* Advanced analytics dashboard

---

## 👨‍💻 Author

**Marimuthu K**

---

## 📜 License

This project is licensed under the **MIT License**

---

## ⭐ Conclusion

The **Local Services Marketplace** simplifies how users discover and book local services by combining:

* 📍 Location Intelligence
* ⚡ Real-Time Systems
* 🔐 Secure Transactions

It delivers a **scalable and production-ready solution** for modern service marketplaces.

---
