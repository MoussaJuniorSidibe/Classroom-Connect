const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public folder
app.use(express.static("public"));

// Store connected students
const students = new Map();

// When someone connects
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // When a student joins with their name
  socket.on("student-join", (name) => {
    students.set(socket.id, { name: name, joinedAt: new Date() });
    console.log(`Student joined: ${name}`);

    // Tell everyone the updated student list
    io.emit("student-list", Array.from(students.values()));
  });

  // When someone disconnects
  socket.on("disconnect", () => {
    const student = students.get(socket.id);
    if (student) {
      console.log(`Student left: ${student.name}`);
      students.delete(socket.id);
      io.emit("student-list", Array.from(students.values()));
    }
  });
});

// Find the local IP address to display
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// Start the server
const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log("");
  console.log("===========================================");
  console.log("   CLASSROOM CONNECT SERVER IS RUNNING");
  console.log("===========================================");
  console.log("");
  console.log(`   Teacher:  http://localhost:${PORT}/teacher.html`);
  console.log(`   Students: http://${localIP}:${PORT}/student.html`);
  console.log("");
  console.log("   Share the student link with your class!");
  console.log("===========================================");
  console.log("");
});