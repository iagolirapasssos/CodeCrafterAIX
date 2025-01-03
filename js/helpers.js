//js/helpers.js
/*
 * Author: Francisco Iago Lira Passos
 * MIT LICENSE
 */

let helperCount = 0; // Contador de Helpers
const blocklyHelpers = {}; // Armazena workspaces de helpers

// Handler para tecla F11
document.addEventListener('keydown', function(event) {
    // Verifica se é a tecla F11 (código 122)
    if (event.keyCode === 122) {
        event.preventDefault(); // Previne o comportamento padrão do F11
        
        // Redimensiona todos os workspaces
        Object.values(blocklyHelpers).forEach(({ blockEditorId, workspace }) => {
            resizeHelperWorkspace(blockEditorId, workspace);
        });

        // Redimensiona o workspace principal
        const mainWorkspace = Blockly.getMainWorkspace();
        if (mainWorkspace) {
            const blocklyDiv = document.getElementById('blocklyDiv');
            const tabContainer = document.querySelector('.tab-container');
            const header = document.querySelector('.header');
            const availableHeight = window.innerHeight - tabContainer.offsetHeight - header.offsetHeight;
            
            if (blocklyDiv) {
                blocklyDiv.style.height = `${availableHeight}px`;
            }
            Blockly.svgResize(mainWorkspace);
        }

        // Força uma atualização após um breve delay
        setTimeout(() => {
            const activeTabId = Array.from(document.querySelectorAll('.tab-content'))
                .find(tab => tab.classList.contains('active'))?.id;
                
            if (activeTabId) {
                showTab(activeTabId);
            }
        }, 100);
    }
});

// Modifique a função resizeHelperWorkspace para ser mais robusta
function resizeHelperWorkspace(blockEditorId, workspace) {
    const blockEditor = document.getElementById(blockEditorId);
    if (blockEditor && workspace) {
        const tabContainer = document.querySelector('.tab-container');
        const header = document.querySelector('.header');
        const availableHeight = window.innerHeight - tabContainer.offsetHeight - header.offsetHeight - 20; // -20 para margem
        
        // Aplica altura mínima e máxima
        const minHeight = 300; // altura mínima em pixels
        const maxHeight = window.innerHeight - 100; // altura máxima
        const finalHeight = Math.max(minHeight, Math.min(availableHeight, maxHeight));
        
        blockEditor.style.height = `${finalHeight}px`;
        blockEditor.style.minHeight = `${minHeight}px`;
        
        // Força o workspace a se ajustar
        workspace.render();
        Blockly.svgResize(workspace);
    }
}

// Adicione um handler para mudança de fullscreen
document.addEventListener('fullscreenchange', function() {
    // Aguarda um momento para o navegador ajustar o tamanho da tela
    setTimeout(() => {
        // Redimensiona todos os workspaces
        Object.values(blocklyHelpers).forEach(({ blockEditorId, workspace }) => {
            resizeHelperWorkspace(blockEditorId, workspace);
        });

        // Redimensiona o workspace principal
        const mainWorkspace = Blockly.getMainWorkspace();
        if (mainWorkspace) {
            Blockly.svgResize(mainWorkspace);
        }
    }, 100);
});

// Função para criar o modal de configurações
function createSettingsModal(helperId, fileNameInputId) {
    const modal = document.createElement('div');
    modal.className = 'helper-modal';
    modal.id = `modal_${helperId}`;
    
    modal.innerHTML = `
        <div class="helper-modal-content">
            <div class="helper-modal-header">
                <h3 class="helper-modal-title">Helper Settings</h3>
                <button class="helper-modal-close" onclick="closeHelperModal('${modal.id}')">&times;</button>
            </div>
            <div class="helper-modal-body">
                <input type="text" 
                       id="${fileNameInputId}" 
                       class="helper-modal-input" 
                       placeholder="Helper File Name">
            </div>
            <div class="helper-modal-buttons">
                <button class="helper-modal-button" onclick="saveBlocksForHelper('${helperId}')">
                    Save Blocks
                </button>
                <button class="helper-modal-button secondary" onclick="loadBlocksForHelper('${helperId}')">
                    Load Blocks
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

// Função para abrir o modal
window.openHelperModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// Função para fechar o modal
window.closeHelperModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

window.deleteHelper = function(helperId) {
    // Confirma antes de deletar
    if (!confirm('Are you sure you want to delete this helper?')) {
        return;
    }

    const helperInfo = blocklyHelpers[helperId];
    if (!helperInfo) return;

    // Remove elementos do DOM
    const tabContentId = helperId.replace('Tab', 'Content');
    const tabContent = document.getElementById(tabContentId);
    const modal = document.getElementById(helperInfo.modalId);
    const tabWrapper = document.querySelector(`[data-helper-id="${helperId}"]`);

    // Remove do DOM
    if (tabContent) tabContent.remove();
    if (modal) modal.remove();
    if (tabWrapper) tabWrapper.remove();

    // Limpa o workspace
    if (helperInfo.workspace) {
        helperInfo.workspace.dispose();
    }

    // Remove do localStorage
    localStorage.removeItem(`helperBlocks_${helperId}`);
    localStorage.removeItem(`helperFileName_${helperId}`);

    // Remove do objeto blocklyHelpers
    delete blocklyHelpers[helperId];

    // Muda para a aba IDE se a aba atual foi deletada
    if (tabContent && tabContent.classList.contains('active')) {
        showTab('ideTab');
    }
}

function generateJavaCodeForWorkspace(workspace) {
    let code = '';
    try {
        // Obtém os blocos principais em ordem
        const topBlocks = workspace.getTopBlocks(true);
        
        // Itera sobre os blocos principais em ordem
        for (const block of topBlocks) {
            // Gera código para cada bloco e seus filhos
            code += Blockly.JavaScript.blockToCode(block);
        }

        // Remove os espaços à esquerda da primeira linha
        const lines = code.split('\n');
        if (lines.length > 0) {
            lines[0] = lines[0].trimStart();
        }
        code = lines.join('\n');

    } catch (error) {
        console.error('Error generating code:', error);
        code = '// Error generating code. Check your blocks.';
    }
    return code;
}

// Função para atualizar o preview de código
function updateHelperCodePreview(helperId) {
    const helperInfo = blocklyHelpers[helperId];
    if (!helperInfo || !helperInfo.codePreviewElement) return;
    
    const code = generateJavaCodeForWorkspace(helperInfo.workspace);
    const codeElement = helperInfo.codePreviewElement.querySelector('code');
    
    if (codeElement) {
        codeElement.textContent = code;
        // Atualiza o highlighting do Prism
        Prism.highlightElement(codeElement);
    }
}

// Função para criar o preview de código
function createCodePreview(helperId) {
    const preview = document.createElement('div');
    preview.className = 'helper-code-preview';
    
    // Cria o cabeçalho
    const header = document.createElement('div');
    header.className = 'helper-code-header';
    
    const title = document.createElement('h4');
    title.className = 'helper-code-title';
    title.textContent = 'Java Code Preview';
    
    const toggleButton = document.createElement('button');
    toggleButton.className = 'helper-code-toggle';
    toggleButton.innerHTML = '⟩';
    toggleButton.title = 'Toggle Code Preview';
    toggleButton.onclick = () => toggleCodePreview(preview);
    
    header.appendChild(title);
    header.appendChild(toggleButton);
    
    // Cria o conteúdo
    const content = document.createElement('pre');
    content.className = 'helper-code-content';
    const code = document.createElement('code');
    code.className = 'language-java';
    content.appendChild(code);
    
    preview.appendChild(header);
    preview.appendChild(content);
    
    return preview;
}

// Função para alternar a visibilidade do preview
function toggleCodePreview(previewElement) {
    const isCollapsed = previewElement.classList.toggle('collapsed');
    const toggleButton = previewElement.querySelector('.helper-code-toggle');
    toggleButton.innerHTML = isCollapsed ? '⟨' : '⟩';
    
    // Força o resize do workspace
    const helperId = previewElement.getAttribute('data-helper-id');
    if (helperId) {
        const helperInfo = blocklyHelpers[helperId];
        if (helperInfo) {
            setTimeout(() => {
                resizeHelperWorkspace(helperInfo.blockEditorId, helperInfo.workspace);
            }, 300); // Aguarda a transição CSS terminar
        }
    }
}

/**
 * Adiciona uma nova aba com um editor Blockly e carrega blocos iniciais.
 */
// Adicionar nova aba de helper (assíncrona)
window.addHelperTab = async function() {
    helperCount++;
    const tabId = `helperTab${helperCount}`;
    const tabContentId = `helperContent${helperCount}`;
    const blockEditorId = `blocklyDivHelper${helperCount}`;
    const fileNameInputId = `helperFileName${helperCount}`;
    const modalId = `modal_${tabId}`;

    // Adiciona botão para a nova aba
    const tabContainer = document.querySelector('.tab-container');
    const tabWrapper = document.createElement('div');
    tabWrapper.className = 'helper-tab-wrapper';
    tabWrapper.setAttribute('data-helper-id', tabId);
    
    // Cria o botão da aba
    const newTab = document.createElement('button');
    newTab.className = 'tab-button';
    newTab.innerText = `Helper ${helperCount}`;
    newTab.setAttribute('onclick', `showTab('${tabContentId}')`);

    // Cria os botões de controle
    const controlButtons = document.createElement('div');
    controlButtons.className = 'helper-control-buttons';

    // Botão de configurações
    const settingsButton = document.createElement('button');
    settingsButton.className = 'helper-settings-button';
    settingsButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
        </svg>
    `;
    settingsButton.setAttribute('onclick', `openHelperModal('${modalId}')`);
    settingsButton.setAttribute('title', 'Helper Settings');

    // Botão de fechar
    const closeButton = document.createElement('button');
    closeButton.className = 'helper-close-button';
    closeButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
    `;
    closeButton.setAttribute('onclick', `deleteHelper('${tabId}')`);
    closeButton.setAttribute('title', 'Delete Helper');

    // Monta a estrutura da aba
    controlButtons.appendChild(settingsButton);
    controlButtons.appendChild(closeButton);
    tabWrapper.appendChild(newTab);
    tabWrapper.appendChild(controlButtons);
    tabContainer.appendChild(tabWrapper);

    // Cria o modal de configurações
    createSettingsModal(tabId, fileNameInputId);

    // Cria o conteúdo da aba
    const tabContentContainer = document.createElement('div');
    tabContentContainer.id = tabContentId;
    tabContentContainer.className = 'tab-content';

    // Cria o container flex para workspace e preview
    const helperContainer = document.createElement('div');
    helperContainer.className = 'helper-container';

    // Container para o workspace
    const workspaceContainer = document.createElement('div');
    workspaceContainer.className = 'helper-workspace';

    // Editor Blockly
    const blockEditor = document.createElement('div');
    blockEditor.id = blockEditorId;
    blockEditor.style.width = '100%';
    blockEditor.style.height = '100%';
    workspaceContainer.appendChild(blockEditor);

    // Cria o preview de código
    const codePreview = createCodePreview(tabId);
    codePreview.setAttribute('data-helper-id', tabId);

    // Monta a estrutura completa
    helperContainer.appendChild(workspaceContainer);
    helperContainer.appendChild(codePreview);
    tabContentContainer.appendChild(helperContainer);
    document.body.appendChild(tabContentContainer);

    // Inicializa o Blockly
    const workspace = Blockly.inject(blockEditorId, {
        toolbox: document.getElementById('toolbox'),
        grid: {
            spacing: 20,
            length: 3,
            colour: '#ccc',
            snap: true
        },
        zoom: {
            controls: true,
            wheel: true,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2
        },
        trashcan: true,
        move: {
            scrollbars: true,
            drag: true,
            wheel: true
        }
    });

    // Adiciona listener para atualizar o preview quando os blocos mudarem
    workspace.addChangeListener(() => {
        updateHelperCodePreview(tabId);
    });

    // Armazena o workspace e elementos relacionados
    blocklyHelpers[tabId] = { 
        workspace, 
        fileNameInputId,
        blockEditorId,
        modalId,
        codePreviewElement: codePreview
    };

    // Exibe a nova aba
    showTab(tabContentId);
    
    // Força o resize após um breve delay
    setTimeout(() => {
        resizeHelperWorkspace(blockEditorId, workspace);
        updateHelperCodePreview(tabId);
    }, 100);

    return workspace;
};

// Nova função para redimensionar workspaces de helpers
function resizeHelperWorkspace(blockEditorId, workspace) {
    if (!workspace) return;
    const blockEditor = document.getElementById(blockEditorId);
    if (blockEditor && workspace) {
        const tabContainer = document.querySelector('.tab-container');
        const header = document.querySelector('.header');
        const availableHeight = window.innerHeight - tabContainer.offsetHeight - header.offsetHeight;
        
        blockEditor.style.height = `${availableHeight}px`;
        Blockly.svgResize(workspace);
    }
}

/**
 * Cria um botão com texto e função de clique.
 * @param {string} text - Texto do botão.
 * @param {Function} onClick - Função ao clicar no botão.
 * @returns {HTMLButtonElement} - Elemento botão.
 */
function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = onClick;
    return button;
}

/**
 * Ajusta o tamanho do editor Blockly e reinicializa o layout.
 * @param {string} blockEditorId - ID do editor Blockly.
 * @param {Blockly.Workspace} workspace - Workspace do Blockly.
 */
function resizeBlocklyDiv(blockEditorId, workspace) {
    const blockEditor = document.getElementById(blockEditorId);
    const tabContainer = document.querySelector('.tab-container');
    const header = document.querySelector('.header');
    const availableHeight = window.innerHeight - tabContainer.offsetHeight - header.offsetHeight;

    if (blockEditor) {
        blockEditor.style.height = `${availableHeight}px`;
    }

    // Recalcula o layout do Blockly
    if (workspace) {
        Blockly.svgResize(workspace);
    }
}

/**
 * Salva os blocos do workspace de um helper.
 * @param {string} helperId - ID do helper.
 */
function saveBlocksForHelper(helperId) {
    try {
        console.log(helperId);
        const { workspace, fileNameInputId } = blocklyHelpers[helperId];
        const mainXmlDom = Blockly.Xml.workspaceToDom(workspace);
        let mainXmlText = Blockly.Xml.domToPrettyText(mainXmlDom);
        mainXmlText = mainXmlText.split('\n').map(line => '    ' + line).join('\n')
        const fileName = document.getElementById(fileNameInputId).value || `helper_${helperId}.json`;


        ;

        for (const [helperId, helperInfo] of Object.entries(blocklyHelpers)) {
            const helperXmlDom = Blockly.Xml.workspaceToDom(helperInfo.workspace);
            let helperXmlText = Blockly.Xml.domToPrettyText(helperXmlDom);
            helperXmlText = helperXmlText.split('\n').map(line => '        ' + line).join('\n');
            const helperFileName = document.getElementById(helperInfo.fileNameInputId)?.value || `helper_${helperId}`;
            helpersData[helperId] = { blocks: helperXmlText, fileName: helperFileName };
        }

        console.log(helpersData);

        
        localStorage.setItem(`helperBlocks_${helperId}`, mainXmlText);
        localStorage.setItem(`helperFileName_${helperId}`, fileName);

        showNotification(`Blocks saved for ${fileName}`, 'success');
    } catch (error) {
        console.error('Error saving blocks:', error);
        showNotification('Failed to save blocks.', 'error');
    }
}

/**
 * Carrega os blocos salvos em um workspace de helper.
 * @param {string} helperId - ID do helper.
 */
function loadBlocksForHelper(helperId) {
    try {
        const { workspace, fileNameInputId } = blocklyHelpers[helperId];
        const blocksXML = localStorage.getItem(`helperBlocks_${helperId}`);
        const fileName = localStorage.getItem(`helperFileName_${helperId}`) || '';

        if (blocksXML) {
            const xmlDom = Blockly.Xml.textToDom(blocksXML);
            workspace.clear();
            Blockly.Xml.domToWorkspace(xmlDom, workspace);

            if (fileName) {
                document.getElementById(fileNameInputId).value = fileName;
            }

            showNotification('Blocks loaded successfully!', 'success');
        } else {
            showNotification('No saved blocks found for this helper.', 'info');
        }
    } catch (error) {
        console.error('Error loading blocks:', error);
        showNotification('Failed to load blocks.', 'error');
    }
}

/**
 * Exibe a aba selecionada.
 * @param {string} tabId - ID da aba.
 */
function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-button');

    // Remove a classe 'active' de todas as abas e botões
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(button => button.classList.remove('active'));

    // Ativa a aba correspondente
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');

        // Redimensiona o workspace apropriado
        if (tabId === 'ideTab') {
            const mainWorkspace = Blockly.getMainWorkspace();
            if (mainWorkspace) {
                setTimeout(() => {
                    Blockly.svgResize(mainWorkspace);
                }, 10);
            }
        } else {
            // Procura por um helper workspace correspondente
            Object.entries(blocklyHelpers).forEach(([helperId, helperData]) => {
                if (tabId === helperData.blockEditorId || tabId.includes(helperId)) {
                    setTimeout(() => {
                        resizeHelperWorkspace(helperData.blockEditorId, helperData.workspace);
                    }, 10);
                }
            });
        }
    }

    // Ativa o botão correspondente
    const activeButton = Array.from(buttons).find(button => 
        button.getAttribute("onclick") === `showTab('${tabId}')`
    );
    if (activeButton) {
        activeButton.classList.add('active');
    }
}


// Adiciona listener para redimensionamento da janela
window.addEventListener('resize', () => {
    // Redimensiona todos os workspaces de helpers
    Object.values(blocklyHelpers).forEach(({ blockEditorId, workspace }) => {
        resizeHelperWorkspace(blockEditorId, workspace);
    });

    // Redimensiona o workspace principal se estiver visível
    const mainWorkspace = Blockly.getMainWorkspace();
    if (mainWorkspace && document.getElementById('ideTab').classList.contains('active')) {
        Blockly.svgResize(mainWorkspace);
    }
});

/**
 * Carrega blocos iniciais no workspace.
 * @param {Blockly.Workspace} workspace - Workspace do Blockly.
 * @param {number} helperIndex - Índice da aba helper para diferenciar blocos.
 */

function loadInitialBlocks(workspace, helperIndex) {
    const initialBlocks = `
        <xml xmlns="http://www.w3.org/1999/xhtml">
            <block type="text_print" x="20" y="20">
                <value name="TEXT">
                    <shadow type="text">
                        <field name="TEXT">Hello from Helper ${helperIndex}!</field>
                    </shadow>
                </value>
            </block>
        </xml>
    `;
    const xmlDom = Blockly.Xml.textToDom(initialBlocks);
    Blockly.Xml.domToWorkspace(xmlDom, workspace);
}
