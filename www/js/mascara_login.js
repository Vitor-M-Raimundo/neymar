document.getElementById("senha").addEventListener("input", function (event) {
  let input = event.target.value;
  if (input.length > 14) {
    input = input.slice(0, 14);
  }
  event.target.value = input;
});

document.getElementById("email").addEventListener("input", function (event) {
  let input = event.target.value;
  if (input.length > 60) {
    input = input.slice(0, 60);
  }
  event.target.value = input;
});


