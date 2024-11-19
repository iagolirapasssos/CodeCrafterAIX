//js/main.js
/*
 * Author: Francisco Iago Lira Passos (iagolirapassos@gmail.com)
 * New blocks in https://google.github.io/blockly-samples/examples/developer-tools/index.html
 * MIT LICENSE
 */
// Variáveis globais
let workspace = Blockly.getMainWorkspace();
let currentLanguage = "pt-br";
let dependencies = []; // Array to store dependency URLs
let editor;

// Sistema de notificações
function showNotification(message, type) {
  let oldNotification = document.querySelector(".notification");
  if (oldNotification) {
    oldNotification.remove();
  }

  let notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Configure Monaco Editor path
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs",
  },
});

// Load Monaco Editor for Manifest XML
require(["vs/editor/editor.main"], function () {
  editor = monaco.editor.create(document.getElementById("androidManifest"), {
    value: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
package="com.mypackage.testextension.testextension">

<application>
<!-- You can use any manifest tag that goes inside the <application> tag -->
<!-- <service android:name="com.example.MyService"> ... </service> -->
</application>

<!-- Other than <application> level tags, you can use <uses-permission> & <queries> tags -->
<!-- <uses-permission android:name="android.permission.INTERNET"/> -->
<!-- <queries> ... </queries> -->

</manifest>`,
    language: "xml", // Set language to XML
    theme: "vs", // Choose a theme: 'vs', 'vs-dark', or 'hc-black'
    automaticLayout: true, // Adjust layout automatically on resize
    lineNumbers: "on", // Show line numbers
  });
});

// Funções para sallet e carregar blocos
window.saveBlocks = function () {
  try {
    let xmlDom = Blockly.Xml.workspaceToDom(workspace);
    let xmlText = Blockly.Xml.domToPrettyText(xmlDom);

    let saveData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      blocks: xmlText,
    };

    let saveString = JSON.stringify(saveData, null, 2);
    let blob = new Blob([saveString], { type: "application/json" });
    let a = document.createElement("a");
    a.download = "extension_blocks.json";
    a.href = URL.createObjectURL(blob);
    a.click();

    showNotification(TRANSLATIONS[currentLanguage]["file_success"], "success");
  } catch (e) {
    console.error("Erro ao sallet blocos:", e);
    showNotification(TRANSLATIONS[currentLanguage]["file_error"], "error");
  }
};

window.loadBlocks = function () {
  let input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = function (e) {
    let file = e.target.files[0];
    let reader = new FileReader();

    reader.onload = function (e) {
      try {
        let saveData = JSON.parse(e.target.result);

        if (!saveData.version) {
          throw new Error("Formato de arquivo inválido");
        }

        let xmlDom = Blockly.utils.xml.textToDom(saveData.blocks);
        workspace.clear();
        Blockly.Xml.domToWorkspace(xmlDom, workspace);

        showNotification(
          TRANSLATIONS[currentLanguage]["file_success"],
          "success"
        );
      } catch (err) {
        console.error("Erro ao carregar blocos:", err);
        showNotification(TRANSLATIONS[currentLanguage]["file_error"], "error");
      }
    };

    reader.readAsText(file);
  };

  input.click();
};

document.addEventListener("DOMContentLoaded", function () {
  const themeSelect = document.getElementById("themeSelect");
  const outputCode = document.getElementById("outputCode");
  const blocklyDiv = document.getElementById("blocklyDiv");

  const resizeBlocklyDiv = () => {
    const blocklyDiv = document.getElementById("blocklyDiv");
    const tabContainer = document.querySelector(".tab-container");
    const header = document.querySelector(".header");

    if (blocklyDiv) {
      const availableHeight =
        window.innerHeight - tabContainer.offsetHeight - header.offsetHeight;
      blocklyDiv.style.height = `${availableHeight}px`;

      // Força o Blockly a recalcular seu tamanho
      if (workspace) {
        Blockly.svgResize(workspace);
      }
    }
  };

  // Redimensiona o editor de blocos ao carregar e ao redimensionar a janela
  window.addEventListener("load", () => {
    resizeBlocklyDiv();
    // Força uma atualização adicional após um breve delay
    setTimeout(resizeBlocklyDiv, 100);
  });

  window.addEventListener("resize", () => {
    resizeBlocklyDiv();
  });

  // Configuração do Blockly
  workspace = Blockly.inject("blocklyDiv", {
    toolbox: document.getElementById("toolbox"),
    grid: {
      spacing: 20,
      length: 3,
      colour: "#ccc",
      snap: true,
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2,
    },
    trashcan: true,
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
  });

  // Força o resize inicial
  resizeBlocklyDiv();

  // Adiciona um pequeno delay para garantir que tudo está renderizado
  setTimeout(() => {
    resizeBlocklyDiv();
    Blockly.svgResize(workspace);
  }, 100);

  // Configuração da mudança de idioma
  const languageSelect = document.getElementById("languageSelect");
  languageSelect.addEventListener("change", function () {
    currentLanguage = this.value; // Atualiza a variável global
    changeLanguage(this.value);
  });

  function changeLanguage(lang) {
    // Atualiza as categorias do toolbox
    document.querySelectorAll('[id^="cat_"]').forEach((category) => {
      const categoryId = category.id.replace("cat_", "category_");
      if (TRANSLATIONS[lang][categoryId]) {
        category.setAttribute("name", TRANSLATIONS[lang][categoryId]);
      }
    });

    // Atualiza textos da interface
    document.getElementById("title").textContent = TRANSLATIONS[lang]["title"];
    // Atualiza categorias do toolbox
    document
      .getElementById("cat_config")
      .setAttribute("name", TRANSLATIONS[lang]["cat_config"]);
    document
      .getElementById("cat_props")
      .setAttribute("name", TRANSLATIONS[lang]["cat_props"]);
    document
      .getElementById("cat_methods")
      .setAttribute("name", TRANSLATIONS[lang]["cat_methods"]);

    // Atualiza os botões da IDE
    document.querySelector(".text-save").parentElement.title =
      TRANSLATIONS[lang]["save_blocks"];
    document.querySelector(".text-load").parentElement.title =
      TRANSLATIONS[lang]["load_blocks"];
    document.querySelector(".text-generate").textContent =
      TRANSLATIONS[lang]["generate_code"];
    document.querySelector(".text-download").textContent =
      TRANSLATIONS[lang]["download_file"];

    // Atualiza o Blockly
    Blockly.setLocale(lang);
  }

  // Função para aplicar o tema
  function applyTheme(theme) {
    const body = document.body;

    // Remove todas as classes de tema previamente aplicadas
    body.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-github",
      "theme-monokai"
    );

    // Adiciona a nova classe de tema
    body.classList.add(`theme-${theme}`);

    // Estilos adicionais para blockly e categorias do toolbox
    const blocklyDiv = document.getElementById("blocklyDiv");
    if (blocklyDiv) {
      blocklyDiv.classList.remove(
        "theme-light",
        "theme-dark",
        "theme-github",
        "theme-monokai"
      );
      blocklyDiv.classList.add(`theme-${theme}`);
    }

    // Atualiza as cores das categorias do toolbox
    const toolboxCategories = document.querySelectorAll("#toolbox category");
    toolboxCategories.forEach((category) => {
      category.style.color = getComputedStyle(document.body).getPropertyValue(
        "--category-text-color"
      );
    });

    // Atualiza as cores do workspace
    Blockly.getMainWorkspace().updateToolbox(
      document.getElementById("toolbox")
    );
  }

  // Adicionar evento ao seletor
  themeSelect.addEventListener("change", (event) => {
    applyTheme(event.target.value);
  });

  // Aplicar o tema padrão ao carregar
  applyTheme(themeSelect.value);

  // Funções de geração e download de código
  window.generateJavaCode = function () {
    try {
      const outputElement = document.getElementById("outputCode");

      // Obtém os blocos principais em ordem
      const topBlocks = workspace.getTopBlocks(true);

      // Inicializa o código gerado
      let code = "";

      // Itera sobre os blocos principais em ordem
      for (const block of topBlocks) {
        // Gera código para cada bloco e seus filhos
        code += Blockly.JavaScript.blockToCode(block);
      }

      // Remove os espaços à esquerda da primeira linha
      const lines = code.split("\n");
      if (lines.length > 0) {
        lines[0] = lines[0].trimStart();
      }
      code = lines.join("\n");

      // Define o código no elemento de saída
      outputElement.textContent = code;

      // Usa Prism.js para realçar o código
      if (typeof Prism !== "undefined" && Prism.languages.java) {
        Prism.highlightElement(outputElement);
      }
    } catch (error) {
      console.error("Error generating code:", error);
      const outputElement = document.getElementById("outputCode");
      outputElement.textContent = "Error generating code. Check your blocks.";
    }
  };

  window.downloadCode = function () {
    const outputElement = document.getElementById("outputCode");
    const code = outputElement.textContent || outputElement.innerText;

    if (!code) {
      showNotification(
        "No code generated. Please generate code first.",
        "error"
      );
      return;
    }

    try {
      // Extração do package e nome da classe
      const packageMatch = code.match(/package\s+([\w\.]+);/);
      const classMatch = code.match(/public\s+class\s+(\w+)/);

      if (!packageMatch || !classMatch) {
        throw new Error(
          "Invalid Java code. Could not extract package or class name."
        );
      }

      const packageName = packageMatch[1];
      const className = classMatch[1];

      // Criar o nome do arquivo
      const fileName = `${className}.java`;

      // Criação do arquivo Java para download
      const blob = new Blob([code], { type: "text/java;charset=utf-8" });
      const a = document.createElement("a");
      a.download = fileName;
      a.href = URL.createObjectURL(blob);
      a.click();

      showNotification(`Code downloaded as ${fileName}`, "success");
    } catch (error) {
      console.error("Error while downloading code:", error);
      showNotification(
        "Failed to download code. Check the console for details.",
        "error"
      );
    }
  };

  document
    .getElementById("blocklyDiv")
    .addEventListener("dragover", handleDragOver);
  document
    .getElementById("blocklyDiv")
    .addEventListener("drop", handleFileDrop);

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleFileDrop(e) {
    e.preventDefault();
    let file = e.dataTransfer.files[0];
    let reader = new FileReader();

    reader.onload = function (event) {
      let saveData = JSON.parse(event.target.result);
      let xmlDom = Blockly.utils.xml.textToDom(saveData.blocks);
      workspace.clear();
      Blockly.Xml.domToWorkspace(xmlDom, workspace);
    };

    reader.readAsText(file);
  }

  workspace.addChangeListener((event) => {
    if (
      event.type === Blockly.Events.BLOCK_CREATE || // Bloco criado
      event.type === Blockly.Events.BLOCK_CHANGE || // Bloco modificado
      event.type === Blockly.Events.BLOCK_DELETE || // Bloco deletado
      event.type === Blockly.Events.BLOCK_MOVE // Bloco movido
    ) {
      generateJavaCode();
    }
  });

  Blockly.getMainWorkspace().addChangeListener((event) => {
    if (
      event.type === Blockly.Events.VAR_RENAME ||
      event.type === Blockly.Events.VAR_CREATE ||
      event.type === Blockly.Events.VAR_DELETE
    ) {
      Blockly.getMainWorkspace()
        .getAllBlocks()
        .forEach((block) => {
          if (typeof block.updateVariableDropdown === "function") {
            block.updateVariableDropdown();
          }
        });
    }
  });

  // Define o idioma inicial
  changeLanguage("en");
});

function showTab(tabId) {
  const tabs = document.querySelectorAll(".tab-content");
  const buttons = document.querySelectorAll(".tab-button");

  // Remove a classe 'active' de todas as abas e botões
  tabs.forEach((tab) => tab.classList.remove("active"));
  buttons.forEach((button) => button.classList.remove("active"));

  // Ativa a aba correspondente
  const activeTab = document.getElementById(tabId);
  if (activeTab) {
    activeTab.classList.add("active");
  } else {
    console.error(`Tab with ID ${tabId} not found.`);
  }

  // Ativa o botão correspondente
  const activeButton = Array.from(buttons).find(
    (button) => button.getAttribute("onclick") === `showTab('${tabId}')`
  );
  if (activeButton) {
    activeButton.classList.add("active");
  } else {
    console.error(`Button for tab with ID ${tabId} not found.`);
  }
}

// Function to add a dependency
function addDependency() {
  const dependencyUrl = document.getElementById("dependencyUrl").value;
  if (!dependencyUrl) {
    showNotification("Please enter a valid URL.", "error");
    return;
  }
  dependencies.push(dependencyUrl);

  const list = document.getElementById("dependenciesList");
  const listItem = document.createElement("li");
  listItem.textContent = dependencyUrl;

  // Add a remove button
  const removeButton = document.createElement("button");
  removeButton.textContent = "Remove";
  removeButton.onclick = () => {
    dependencies = dependencies.filter((url) => url !== dependencyUrl);
    list.removeChild(listItem);
  };
  listItem.appendChild(removeButton);

  list.appendChild(listItem);
  document.getElementById("dependencyUrl").value = ""; // Clear the input field
}

// Função para compilar extensão
// Extend compileExtension to send dependencies to the server
async function compileExtension() {
  const progressModal = showProgressModal();

  try {
    // Get data from the other tabs
    const outputElement = document.getElementById("outputCode");
    const code = outputElement.textContent || outputElement.innerText;
    const manifestContent = editor.getValue();
    const fastYmlContent = document.getElementById("fastYml").value;

    if (!code) {
      showNotification(
        "No code generated. Please generate code first.",
        "error"
      );
      progressModal.close();
      return;
    }

    // Extract packageName and className
    const packageMatch = code.match(/package\s+([\w\.]+);/);
    const classMatch = code.match(/public\s+class\s+(\w+)/);

    if (!classMatch) {
      throw new Error("Invalid Java code. Could not extract class name.");
    }

    const className = classMatch[1];
    const packageName = packageMatch ? packageMatch[1] : "com.example";

    // Update AndroidManifest.xml packageName
    const updatedManifestContent = manifestContent.replace(
      /package="[^"]*"/,
      `package="${packageName}"`
    );

    // Send data to the server, including dependencies
    const response = await fetch("https://localhost:8080/compile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        className,
        packageName,
        androidManifest: updatedManifestContent,
        fastYml: fastYmlContent,
        dependencies: dependencies, // Send dependencies as part of the request
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.json().catch(() => null);
      const errorMessage = errorDetails?.error || "Unknown error occurred.";
      throw new Error(`Failed to compile the extension: ${errorMessage}`);
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    progressModal.updateWithDownload(downloadUrl, `${className}.aix`);

    await cleanupProjectDirectory(className);
  } catch (error) {
    console.error("Error during compilation:", error);
    showNotification(
      "Compilation failed. Check the console for more details.",
      "error"
    );
    progressModal.close();
  }
}

function showProgressModal() {
  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
        <div class="modal-content">
            <h2>Please wait...</h2>
            <p>Your extension is being generated. This might take a few seconds.</p>
            <div class="progress-circle"></div>
            <button class="close-modal">Close</button>
        </div>
    `;

  document.body.appendChild(modal);

  const closeModalButton = modal.querySelector(".close-modal");
  if (closeModalButton) {
    closeModalButton.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
  }

  // Method to update the modal with a download link
  modal.updateWithDownload = (downloadUrl, fileName) => {
    modal.innerHTML = `
            <div class="modal-content">
                <h2>Extension Compiled Successfully!</h2>
                <p>Your extension is ready for download:</p>
                <a href="${downloadUrl}" download="${fileName}" class="download-link">Download ${fileName}</a>
                <button class="close-modal">Close</button>
            </div>
        `;

    const updatedCloseModalButton = modal.querySelector(".close-modal");
    if (updatedCloseModalButton) {
      updatedCloseModalButton.addEventListener("click", () => {
        document.body.removeChild(modal);
      });
    }
  };

  // Method to close the modal
  modal.close = () => {
    document.body.removeChild(modal);
  };

  return modal;
}

async function cleanupProjectDirectory(className) {
  try {
    const response = await fetch(
      `https://localhost:8080/cleanup/${className}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      console.error(
        "Failed to cleanup project directory. Response status:",
        response.status
      );
    } else {
      console.log(
        `Project directory for ${className} cleaned up successfully.`
      );
    }
  } catch (error) {
    console.error("Error during project directory cleanup:", error);
  }
}

// Evento de clique no botão
//document.querySelector('.button').addEventListener('click', compileExtension);
