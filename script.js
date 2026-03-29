const form = document.getElementById('escrever-tarefa');
const inputTask = document.getElementById('tarefa');
const selPrio = document.getElementById('prioridade');
const inputData = document.getElementById('data');
const inputHora = document.getElementById('hora');
const busca = document.getElementById('procurar-tarefa');
const ordem = document.getElementById('filtrar-tarefa');

const listaPendente = document.getElementById('lista-pendentes');
const listaAndamento = document.getElementById('lista-andamento');
const listaConcluida = document.getElementById('lista-concluidas');

const btnAdd = document.getElementById('adicionar-tarefa');
const btnCancel = document.getElementById('cancelar-edição');

const btnTodas = document.getElementById('listar-todas');
const btnUrgentes = document.getElementById('listar-urgentes');
const btnLimpar = document.getElementById('limpar-tudo');

const pesos = { 'urgente': 1, 'importante': 2, 'tranquilo': 3 };
let editando = null; 

window.onload = function() {
    carregar();
};

// Atualiza o visual das colunas com as novas tarefas criadas
function renderizar(lista) {
    listaPendente.innerHTML = "";
    listaAndamento.innerHTML = "";
    listaConcluida.innerHTML = "";
    
    for (let i = 0; i < lista.length; i++) {
        let t = lista[i];
        criarItem(t.nome, t.prioridade, t.data, t.hora, t.criacao, t.coluna, false);
    }
    atualizarContadores();
}

function filtrar(tipo) {
    let dados = localStorage.getItem('minhasTarefas');
    let tarefas = dados ? JSON.parse(dados) : [];
    
    if (tipo === 'todas') {
        tarefas.sort(function(a, b) {
            let dataA = new Date(a.data + "T" + (a.hora || '00:00'));
            let dataB = new Date(b.data + "T" + (b.hora || '00:00'));
            return dataA - dataB;
        });
        renderizar(tarefas);
    } else {
        let filtradas = tarefas.filter(function(t) {
            return t.prioridade === tipo;
        });
        renderizar(filtradas);
    }
}

function procurar() {
    let termo = busca.value.toLowerCase();
    let itens = document.querySelectorAll('li');
    for (let i = 0; i < itens.length; i++) {
        let item = itens[i];
        if (item.innerText.toLowerCase().includes(termo)) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    }
}

function ordenar() {
    let valor = ordem.value;
    let dados = localStorage.getItem('minhasTarefas');
    let tarefas = dados ? JSON.parse(dados) : [];
    let agora = new Date();

    if (valor === "alfabética") {
        tarefas.sort((a, b) => a.nome.localeCompare(b.nome));
    } else if (valor === "data") {
        tarefas.sort((a, b) => new Date(a.data + "T" + (a.hora || '00:00')) - new Date(b.data + "T" + (b.hora || '00:00')));
    } else if (valor === "criacao") {
        tarefas.sort((a, b) => a.criacao - b.criacao);
    } else if (valor === "prioridade") {
        tarefas.sort((a, b) => pesos[a.prioridade] - pesos[b.prioridade]);
    } else if (valor === "atrasadas") {
        tarefas = tarefas.filter(function(t) {
            let dataT = new Date(t.data + "T" + (t.hora || '00:00'));
            return dataT < agora && t.coluna !== 'lista-concluidas';
        });
    }
    renderizar(tarefas);
}

function salvarTarefa() {
    let nome = inputTask.value;
    let prio = selPrio.value;
    let data = inputData.value;
    let hora = inputHora.value;

    if (nome.trim() === "") { 
        alert("Por favor, digite o nome da tarefa."); 
        return; 
    }

    criarItem(nome, prio, data, hora, Date.now());
    fecharEdicao();
}

//cria a linha da tarefa na tela com os dados que o usuário digitou
function criarItem(nome, prio, data, hora, criacao, alvo = 'lista-pendentes', salvar = true) {
    let dataFormatada = "";
    if (data) {
        let partes = data.split("-");
        dataFormatada = partes[2] + "/" + partes[1] + "/" + partes[0];
    }

    let li = document.createElement('li');
    li.id = "id-" + criacao; 
    li.className = "tarefa-" + prio;
    
    if (alvo === 'lista-concluidas') {
        li.classList.add('tarefa-concluida');
    }

    li.draggable = true;
    li.dataset.prioridade = prio;
    li.dataset.data = data;
    li.dataset.hora = hora || "00:00";
    li.dataset.criacao = criacao; 

    let agora = new Date();
    let dataTarefa = new Date(data + "T" + (hora || '00:00'));
    let atrasada = data && dataTarefa < agora && alvo !== 'lista-concluidas';

    li.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData("text", e.target.id);
    });

    li.innerHTML = `
        <div class="texto-info">
            <span class="txt-tarefa">${nome}</span>
            <span class="txt-detalhes">${dataFormatada} ${hora} | <strong>${prio}</strong></span>
        </div>
        <div class="acoes-tarefa">
            <button class="btn-delete">x</button>
            <button class="btn-edit">✎</button>
        </div>
    `;

    li.querySelector('.texto-info').addEventListener('click', function() {
        mover(li);
    });

    li.querySelector('.btn-delete').addEventListener('click', function() {
        remover(li);
    });

    li.querySelector('.btn-edit').addEventListener('click', function() {
        editar(li);
    });

    if (atrasada) {
        li.classList.add("atrasado-texto");
        let alerta = document.createElement('span');
        alerta.textContent = " !";
        alerta.className = "atrasado-exclamacao";
        li.querySelector('.txt-tarefa').appendChild(alerta);
    }

    document.getElementById(alvo).appendChild(li);
    if (salvar) {
        salvarLocal();
    }
}

function editar(li) {
    if (editando) {
        if (confirm("Você já está editando uma tarefa. Deseja trocar?")) {
            cancelarEdicao();
        } else {
            return;
        }
    }

    editando = {
        nome: li.querySelector('.txt-tarefa').innerText.replace(" !", ""),
        prioridade: li.dataset.prioridade,
        data: li.dataset.data,
        hora: li.dataset.hora,
        criacao: li.dataset.criacao,
        coluna: li.parentElement.id
    };

    inputTask.value = editando.nome;
    inputData.value = editando.data; 
    inputHora.value = editando.hora;
    selPrio.value = editando.prioridade;

    btnAdd.innerText = "Salvar Edição";
    btnAdd.classList.add('btn-salvando');
    btnCancel.style.display = "inline-block";

    li.remove(); 
    salvarLocal();
}

function cancelarEdicao() {
    if (editando) {
        criarItem(editando.nome, editando.prioridade, editando.data, editando.hora, editando.criacao, editando.coluna);
        fecharEdicao();
    }
}

function fecharEdicao() {
    editando = null;
    btnAdd.innerText = "Adicionar";
    btnAdd.classList.remove('btn-salvando');
    btnCancel.style.display = "none";
    form.reset();
}

function salvarLocal() {
    let array = [];
    let itens = document.querySelectorAll('li');
    
    for (let i = 0; i < itens.length; i++) {
        let item = itens[i];
        array.push({
            id: item.id, 
            nome: item.querySelector('.txt-tarefa').innerText.replace(" !", ""),
            prioridade: item.dataset.prioridade, 
            data: item.dataset.data,
            hora: item.dataset.hora, 
            criacao: item.dataset.criacao,
            coluna: item.parentElement.id
        });
    }
    localStorage.setItem('minhasTarefas', JSON.stringify(array));
    atualizarContadores();
}

function carregar() {
    let memoria = localStorage.getItem('minhasTarefas');
    if (memoria) {
        let tarefas = JSON.parse(memoria);
        tarefas.sort(function(a, b) {
            return new Date(a.data + "T" + (a.hora || '00:00')) - new Date(b.data + "T" + (b.hora || '00:00'));
        });
        renderizar(tarefas);
    }
}

function atualizarContadores() {
    document.getElementById('contador-pendentes').innerText = listaPendente.children.length;
    document.getElementById('contador-andamento').innerText = listaAndamento.children.length;
    document.getElementById('contador-concluidas').innerText = listaConcluida.children.length;
}

function mover(li) {
    let novaColuna = 'lista-pendentes';
    if (li.parentElement.id === 'lista-pendentes') {
        novaColuna = 'lista-andamento';
    } else if (li.parentElement.id === 'lista-andamento') {
        novaColuna = 'lista-concluidas';
    }
    
    let nome = li.querySelector('.txt-tarefa').innerText.replace(" !", "");
    let prio = li.dataset.prioridade;
    let data = li.dataset.data;
    let hora = li.dataset.hora;
    let criacao = li.dataset.criacao;

    li.remove();
    criarItem(nome, prio, data, hora, criacao, novaColuna);
}

function remover(li) { 
    if (confirm("Apagar tarefa?")) { 
        li.remove(); 
        salvarLocal(); 
    } 
}

function resetarTudo() {
    if (confirm("Tem certeza que deseja apagar TODAS as tarefas?")) {
        localStorage.removeItem('minhasTarefas');
        renderizar([]);
    }
}

btnAdd.addEventListener('click', salvarTarefa);
btnCancel.addEventListener('click', cancelarEdicao);
btnTodas.addEventListener('click', function() { filtrar('todas'); });
btnUrgentes.addEventListener('click', function() { filtrar('urgente'); });
btnLimpar.addEventListener('click', resetarTudo);
busca.addEventListener('keyup', procurar);
ordem.addEventListener('change', ordenar);

let listas = [listaPendente, listaAndamento, listaConcluida]; //Permite arrastar as tarefas entre as colunas e atualizar o status automaticamente
for (let i = 0; i < listas.length; i++) {
    let lista = listas[i];
    lista.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    lista.addEventListener('drop', function(e) {
        e.preventDefault();
        let id = e.dataTransfer.getData("text");
        let el = document.getElementById(id);
        let zone = e.target;
        while (zone && zone.tagName !== 'UL') {
            zone = zone.parentElement;
        }
        if (zone) { 
            let nome = el.querySelector('.txt-tarefa').innerText.replace(" !", "");
            let prio = el.dataset.prioridade;
            let data = el.dataset.data;
            let hora = el.dataset.hora;
            let criacao = el.dataset.criacao;
            el.remove();
            criarItem(nome, prio, data, hora, criacao, zone.id);
        }
    });
}
