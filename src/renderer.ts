import { GladeType } from "./GladeTypes/glade_types";

var windowTopBar = document.createElement("div");
windowTopBar.style.width = "100%";
windowTopBar.style.height = "32px";
windowTopBar.style.backgroundColor = "#4f4f7a";
windowTopBar.style.position = "absolute";
windowTopBar.style.top = windowTopBar.style.left = 0;
windowTopBar.style.webkitAppRegion = "drag";
document.body.appendChild(windowTopBar);

const contextButton = document.getElementById("context-btn");
const confirmYesButton = document.getElementById("confirm-yes-btn");
const confirmNoButton = document.getElementById("confirm-no-btn");
const confirmButtons = document.getElementById("confirm-btns");
const contextResult = document.getElementById("context-result");
const refreshButton = document.getElementById("refresh-btn");
const gladeOptions = document.getElementById("glade-options");

let result: string | null = null;
let exludedDirectories: string[] = [];

async function findDirectory(excludedDirectories: string[]) {
  console.log("Searching...");
  contextResult.textContent = "Searching...";
  result = await electronAPI.findDirectory(excludedDirectories);

  if (result) {
    contextResult.textContent = "Is this your glade?";
  } else {
    document.getElementById("title").textContent = "No more glades left :(";
    contextResult.hidden = true;
    contextButton.hidden = true;
    refreshButton.hidden = false;
    document.getElementById("latest-glade-screenshot").hidden = true;
    return;
  }

  const screenshot = await electronAPI.getGladeScreenshot(result);
  if (screenshot) {
    const img = document.getElementById("latest-glade-screenshot");
    if (!img) {
      const errorElement = document.createElement("p");
      errorElement.textContent = "Error: Image element not found";
      document.body.appendChild(errorElement);
      return;
    }
    img.src = `data:image/jpeg;base64,${screenshot}`;
    img.hidden = false;

    contextButton.hidden = true;
    confirmButtons.hidden = false;
  }
}

const populateGladeOptions = async () => {
  for (const gladeType in GladeType) {
    const option = document.createElement("button");
    option.value = gladeType;
    option.textContent = gladeType;
    option.className =
      "font-custom font-semibold min-w-64 border-[1px] p-2 rounded-md hover:text-black hover:bg-gray-100 transition-all duration-200 ease-in-out mt-2";
    option.addEventListener("click", async () => {
      const shouldIKill = await electronAPI.requestTinyGladeExit();
      if (shouldIKill === 0) {
        return;
      }
      const err = await electronAPI.setGladeType(gladeType as GladeType);
      if (err) {
        alert(err);
        return;
      }
      alert("Glade theme set!");
    });
    gladeOptions.appendChild(option);
  }
};

// find directories on click
contextButton.addEventListener("click", async () => {
  await findDirectory(exludedDirectories);
});

confirmYesButton.addEventListener("click", () => {
  confirmButtons.hidden = true;
  contextResult.hidden = true;
  populateGladeOptions();
  gladeOptions.hidden = false;
});

confirmNoButton.addEventListener("click", () => {
  if (!result) {
    return;
  }

  confirmButtons.hidden = true;
  contextButton.hidden = false;

  exludedDirectories.push(result);
  findDirectory(exludedDirectories);
});

refreshButton.addEventListener("click", async function () {
  this.classList.add("animate-bouncy-rotate");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  this.classList.remove("animate-bouncy-rotate");

  await electronAPI.refreshWindow();
});

document.getElementById("back-btn").addEventListener("click", async () => {
  await electronAPI.refreshWindow();
});
