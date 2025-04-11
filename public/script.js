// document.addEventListener("DOMContentLoaded", () => {
//     const input = document.getElementById("queryInput");
//     const output = document.getElementById("output");
//     const button = document.getElementById("submitBtn");
  
//     button.addEventListener("click", () => {
//       const text = input.value.toLowerCase().trim();
  
//       if (text) {
//         // Send input to the server
//         fetch("/process", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json"
//           },
//           body: JSON.stringify({ text }) // send user input
//         })
//         .then(res => res.json())
//         .then(data => {
//           if (data && data.response) {
//             output.innerHTML = `<strong>${data.response}</strong>`;
//           } else {
//             output.textContent = "No response from server.";
//           }
//         })
//         .catch(err => {
//           console.error(err);
//           output.textContent = "Error communicating with server.";
//         });
//       } else {
//         output.textContent = "Please enter some text.";
//       }
//     });
//   });
  
//if keyword found check which keyword and corresponding to that use the db and send the data to ollama and get the reposnse.