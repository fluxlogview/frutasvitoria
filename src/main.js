// Aplicação NexusERP - Frontend com localStorage

// Chave para persistência no localStorage
const STORAGE_KEY = 'nexuserp_data';

// Estados da aplicação
let editando = false;
let tabelaAtiva = 'dashboard';
let ordenacaoProdutos = 'nome-asc';
let usuarioAtual = null;
const TEMA_KEY = 'nexuserp_tema';
let usuarios = JSON.parse(localStorage.getItem(STORAGE_KEY + '_usuarios')) || [];
let clientes = JSON.parse(localStorage.getItem(STORAGE_KEY + '_clientes')) || [];
let produtos = JSON.parse(localStorage.getItem(STORAGE_KEY + '_produtos')) || [];
let vendas = JSON.parse(localStorage.getItem(STORAGE_KEY + '_vendas')) || [];
let movimentos = JSON.parse(localStorage.getItem(STORAGE_KEY + '_movimentos')) || [];

// Elementos DOM
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Sanitizar valores exibidos no HTML
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

// Próximo ID sequencial de uma coleção
function proximoId(lista) {
    return lista.reduce((maior, item) => Math.max(maior, Number(item.id) || 0), 0) + 1;
}

// Reindexar IDs antigos (baseados em timestamp) para sequenciais
function normalizarIds() {
    let alterou = false;

    const mapaProdutos = new Map();
    const produtosMudaram = produtos.some((p, i) => Number(p.id) !== i + 1);

    if (produtosMudaram) {
        produtos.forEach((produto, i) => {
            mapaProdutos.set(Number(produto.id), i + 1);
            produto.id = i + 1;
        });

        vendas.forEach(venda => {
            const novoId = mapaProdutos.get(Number(venda.produto_id));
            if (novoId) venda.produto_id = novoId;
        });

        movimentos.forEach(movimento => {
            const novoId = mapaProdutos.get(Number(movimento.produto_id));
            if (novoId) movimento.produto_id = novoId;
        });

        alterou = true;
    }

    produtos.forEach(produto => {
        const nomeMaiusculo = String(produto.nome || '').toUpperCase();
        if (produto.nome !== nomeMaiusculo) {
            produto.nome = nomeMaiusculo;
            alterou = true;
        }

        if (!produto.unidade) {
            produto.unidade = 'UN';
            alterou = true;
        }
    });

    const mapaClientes = new Map();
    const clientesMudaram = clientes.some((cliente, i) => Number(cliente.id) !== i + 1);

    if (clientesMudaram) {
        clientes.forEach((cliente, i) => {
            mapaClientes.set(Number(cliente.id), i + 1);
            cliente.id = i + 1;
        });

        vendas.forEach(venda => {
            const novoId = mapaClientes.get(Number(venda.cliente_id));
            if (novoId) venda.cliente_id = novoId;
        });

        alterou = true;
    }

    if (vendas.some((venda, i) => Number(venda.id) !== i + 1)) {
        vendas.forEach((venda, i) => { venda.id = i + 1; });
        alterou = true;
    }

    if (movimentos.some((movimento, i) => Number(movimento.id) !== i + 1)) {
        movimentos.forEach((movimento, i) => { movimento.id = i + 1; });
        alterou = true;
    }

    usuarios.forEach(usuario => {
        if (!usuario.nome) {
            usuario.nome = usuario.usuario === 'admin' ? 'Administrador' : usuario.usuario;
            alterou = true;
        }
        if (!usuario.perfil) {
            usuario.perfil = 'admin';
            alterou = true;
        }
    });

    if (alterou) salvarDados();
}

// Inicializar dados se vazio
function inicializarDados() {
    if (usuarios.length === 0) {
        // Usuário admin padrão
        usuarios.push({
            id: 1,
            usuario: 'admin',
            senha: 'admin',
            email: ''
        });
        salvarDados();
    }
    
    if (clientes.length === 0) {
        // Clientes de exemplo
        clientes.push({
            id: 1,
            nome: 'João Silva',
            email: 'joao@email.com',
            telefone: '(11) 99999-1111',
            endereco: 'Rua A, 123'
        });
        clientes.push({
            id: 2,
            nome: 'Maria Santos',
            email: 'maria@email.com',
            telefone: '(21) 98888-2222',
            endereco: 'Av. B, 456'
        });
        salvarDados();
    }
    
    if (produtos.length === 0) {
        // Produtos de exemplo
        produtos.push({
            id: 1,
            nome: 'Notebook Dell Inspiron 15',
            preco: 3500.00,
            estoque: 10,
            min_stock: 3,
            descricao: 'Notebook 15.6" Intel i5 8GB RAM 256GB SSD'
        });
        produtos.push({
            id: 2,
            nome: 'Mouse Sem Fio Logitech',
            preco: 89.90,
            estoque: 50,
            min_stock: 10,
            descricao: 'Mouse óptico sem fio USB'
        });
        produtos.push({
            id: 3,
            nome: 'Teclado Mecânico Redragon',
            preco: 249.90,
            estoque: 20,
            min_stock: 5,
            descricao: 'Teclado mecânico RGB switch blue'
        });
        salvarDados();
    }
    
    if (vendas.length === 0) {
        // Vendas de exemplo (opcional)
        salvarDados();
    }
}

// Função para fazer login
function login(username, password) {
    const usuario = usuarios.find(u =>
        String(u.usuario).toLowerCase() === String(username).trim().toLowerCase() &&
        u.senha === password
    );
    if (usuario) {
        return {
            id: usuario.id,
            usuario: usuario.usuario,
            nome: usuario.nome || usuario.usuario,
            perfil: usuario.perfil || 'admin'
        };
    }
    return null;
}

// Aplicar dados do usuário logado na interface
function iniciaisNome(nome) {
    return String(nome || 'US')
        .trim()
        .split(/\s+/)
        .map(parte => parte.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function rotuloPerfil(perfil) {
    return perfil === 'admin' ? 'Administrador' : 'Operador';
}

function aplicarSessao() {
    if (!usuarioAtual) return;

    const nome = usuarioAtual.nome || usuarioAtual.usuario;
    const perfil = rotuloPerfil(usuarioAtual.perfil);
    const iniciais = iniciaisNome(nome);

    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserRole = document.getElementById('dropdownUserRole');

    if (sidebarAvatar) sidebarAvatar.textContent = iniciais;
    if (sidebarUserName) sidebarUserName.textContent = nome;
    if (sidebarUserRole) sidebarUserRole.textContent = perfil;
    if (dropdownUserName) dropdownUserName.textContent = nome;
    if (dropdownUserRole) dropdownUserRole.textContent = perfil;

    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
        userMenuBtn.title = nome;
        userMenuBtn.setAttribute('aria-label', `Menu de ${nome}`);
    }

    const navUsuarios = document.getElementById('usuariosNavBtn');
    if (navUsuarios) {
        navUsuarios.classList.toggle('hidden', usuarioAtual.perfil !== 'admin');
    }
}

// Função para fazer logout
function logout() {
    usuarioAtual = null;
    const dropdownAberto = document.getElementById('userDropdown');
    if (dropdownAberto) dropdownAberto.classList.add('hidden');
    const botaoMenu = document.getElementById('userMenuBtn');
    if (botaoMenu) botaoMenu.setAttribute('aria-expanded', 'false');
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    loginForm.reset();
    loginError.classList.add('hidden');
    tabelaAtiva = 'dashboard';
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    const secaoDashboard = document.getElementById('dashboard');
    if (secaoDashboard) secaoDashboard.classList.add('active');
    atualizarBotoesAtivos();
}

// Salvar todos os dados no localStorage
function salvarDados() {
    localStorage.setItem(STORAGE_KEY + '_usuarios', JSON.stringify(usuarios));
    localStorage.setItem(STORAGE_KEY + '_clientes', JSON.stringify(clientes));
    localStorage.setItem(STORAGE_KEY + '_produtos', JSON.stringify(produtos));
    localStorage.setItem(STORAGE_KEY + '_vendas', JSON.stringify(vendas));
    localStorage.setItem(STORAGE_KEY + '_movimentos', JSON.stringify(movimentos));
}

// ---------- Usuários ----------
function renderUsuarios() {
    const tbody = document.querySelector('#usuariosTable tbody');
    if (!tbody) return;

    tbody.innerHTML = usuarios.map(usuario => {
        const ehSessaoAtual = usuarioAtual && Number(usuarioAtual.id) === Number(usuario.id);

        return `
            <tr>
                <td>${usuario.id}</td>
                <td>${escapeHtml(usuario.nome || usuario.usuario)}</td>
                <td>${escapeHtml(usuario.usuario)}</td>
                <td>${rotuloPerfil(usuario.perfil || 'admin')}</td>
                <td>
                    <div class="row-actions">
                        ${ehSessaoAtual
                            ? '<span class="text-muted">Sessão atual</span>'
                            : `<button type="button" class="btn-submit btn-sm btn-danger" onclick="excluirUsuario(${usuario.id})">Excluir</button>`}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.excluirUsuario = function (id) {
    if (!usuarioAtual || usuarioAtual.perfil !== 'admin') {
        alert('Apenas administradores podem excluir usuários.');
        return;
    }

    const usuario = usuarios.find(u => Number(u.id) === Number(id));
    if (!usuario) return;

    if (Number(usuarioAtual.id) === Number(id)) {
        alert('Você não pode excluir o próprio usuário.');
        return;
    }

    const administradores = usuarios.filter(u => (u.perfil || 'admin') === 'admin');
    if ((usuario.perfil || 'admin') === 'admin' && administradores.length <= 1) {
        alert('É necessário manter pelo menos um administrador.');
        return;
    }

    if (!confirm(`Excluir o usuário "${usuario.usuario}"?`)) return;

    usuarios = usuarios.filter(u => Number(u.id) !== Number(id));
    salvarDados();
    renderUsuarios();
};

// Carregar clientes do localStorage
function carregarClientes() {
    renderClientes(clientes);
}

// Renderizar clientes na tabela
function renderClientes(listaClientes) {
    const tbody = document.querySelector('#clientesTable tbody');
    tbody.innerHTML = '';
    
    listaClientes.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cliente.id}</td>
            <td>${escapeHtml(cliente.nome)}</td>
            <td>${escapeHtml(cliente.email)}</td>
            <td>${escapeHtml(cliente.telefone)}</td>
            <td>${escapeHtml(cliente.endereco)}</td>
            <td>
                <div class="row-actions">
                    <button type="button" class="btn-submit btn-sm btn-edit" onclick="editarCliente(${cliente.id})">Editar</button>
                    <button type="button" class="btn-submit btn-sm btn-danger" onclick="excluirCliente(${cliente.id})">Excluir</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Carregar produtos do localStorage
function carregarProdutos() {
    renderProdutos(produtos);
}

// Renderizar produtos na tabela
function renderProdutos(listaProdutos) {
    const tbody = document.querySelector('#produtosTable tbody');
    tbody.innerHTML = '';

    const listaOrdenada = [...listaProdutos].sort((a, b) => {
        if (ordenacaoProdutos === 'nome-asc') {
            return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
        }
        if (ordenacaoProdutos === 'nome-desc') {
            return String(b.nome).localeCompare(String(a.nome), 'pt-BR');
        }
        if (ordenacaoProdutos === 'id-desc') {
            return Number(b.id) - Number(a.id);
        }
        return Number(a.id) - Number(b.id);
    });

    listaOrdenada.forEach(produto => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${produto.id}</td>
            <td>${escapeHtml(produto.nome)}</td>
            <td>${produto.unidade || 'UN'}</td>
            <td>
                <div class="row-actions">
                    <button type="button" class="btn-submit btn-sm btn-edit" onclick="editarProduto(${produto.id})">Editar</button>
                    <button type="button" class="btn-submit btn-sm btn-danger" onclick="excluirProduto(${produto.id})">Excluir</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Carregar vendas do localStorage
function carregarVendas() {
    renderVendas(vendas);
}

// Preencher os selects dos formulários de venda
function popularSelects() {
    const produtoSelect = document.getElementById('produtoSelect');
    const clienteSelect = document.getElementById('clienteSelect');

    if (produtoSelect) {
        produtoSelect.innerHTML = '<option value="">Selecione um produto</option>' +
            produtos.map(p => `<option value="${p.id}">${escapeHtml(p.nome)} (${p.estoque} ${p.unidade || 'UN'} em estoque)</option>`).join('');
    }

    if (clienteSelect) {
        clienteSelect.innerHTML = '<option value="">Selecione um cliente</option>' +
            clientes.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
    }
}

// Preencher o select de produtos da aba Estoque
function popularSelectEstoque() {
    const select = document.getElementById('estoqueProdutoSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um produto</option>' +
        produtos.map(p => `<option value="${p.id}">${escapeHtml(p.nome)} (saldo: ${p.estoque} ${p.unidade || 'UN'})</option>`).join('');
}

// Renderizar histórico de movimentações de estoque
function renderMovimentos(lista) {
    const tbody = document.querySelector('#movimentosTable tbody');
    if (!tbody) return;

    const rotulos = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' };
    tbody.innerHTML = '';

    [...lista].reverse().forEach(mov => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${mov.id}</td>
            <td>${escapeHtml(mov.produto_nome)} <span class="text-muted">· ${escapeHtml(mov.unidade || 'UN')}</span></td>
            <td><span class="badge badge-${mov.tipo}">${rotulos[mov.tipo] || 'Movimento'}</span></td>
            <td>${mov.quantidade}</td>
            <td>${mov.saldo}</td>
            <td>${escapeHtml(mov.motivo)}</td>
            <td>${new Date(mov.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Registrar movimentação de estoque
function movimentarEstoque(produtoId, tipo, quantidade, motivo) {
    const produto = produtos.find(p => p.id === produtoId);

    if (!produto) {
        alert('Produto não encontrado.');
        return false;
    }

    let saldo;
    if (tipo === 'entrada') {
        saldo = produto.estoque + quantidade;
    } else if (tipo === 'saida') {
        if (produto.estoque < quantidade) {
            alert('Estoque insuficiente.\nSaldo disponível: ' + produto.estoque);
            return false;
        }
        saldo = produto.estoque - quantidade;
    } else {
        saldo = quantidade;
    }

    produto.estoque = saldo;

    movimentos.push({
        id: proximoId(movimentos),
        produto_id: produto.id,
        produto_nome: produto.nome,
        unidade: produto.unidade || 'UN',
        tipo: tipo,
        quantidade: quantidade,
        saldo: saldo,
        motivo: motivo ? motivo.trim() : '',
        data: new Date().toISOString()
    });

    salvarDados();
    document.getElementById('estoqueForm').reset();
    carregarProdutos();
    popularSelects();
    popularSelectEstoque();
    renderMovimentos(movimentos);
    atualizarDashboard();
    return true;
}

// Renderizar vendas na lista
function renderVendas(listaVendas) {
    const lista = document.getElementById('vendasList');
    if (!lista) return;

    const pagamentos = {
        dinheiro: 'Dinheiro',
        pix: 'Pix',
        credito: 'Cartão de crédito',
        debito: 'Cartão de débito',
        boleto: 'Boleto'
    };

    if (listaVendas.length === 0) {
        lista.innerHTML = '<div class="sale-empty">Nenhuma venda registrada.</div>';
        return;
    }

    lista.innerHTML = listaVendas.map(venda => {
        const situacao = venda.situacao || 'concluida';
        const cancelada = situacao === 'cancelada';
        const dataFormatada = new Date(venda.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const pagamento = pagamentos[venda.pagamento] || '—';
        const total = parseFloat(venda.total).toFixed(2).replace('.', ',');

        return `
            <div class="sale-row${cancelada ? ' sale-cancelled' : ''}">
                <span class="sale-id">#${venda.id}</span>
                <div class="sale-info">
                    <strong>${escapeHtml(venda.produto_nome)}</strong>
                    <small>${escapeHtml(venda.cliente_nome)} · ${venda.quantidade} ${venda.unidade || 'un'} · ${pagamento}</small>
                </div>
                <span class="badge badge-${situacao}">${cancelada ? 'Cancelada' : 'Concluída'}</span>
                <span class="sale-amount">R$ ${total}</span>
                <span class="sale-date">${dataFormatada}</span>
                ${cancelada
                    ? '<span class="text-muted">—</span>'
                    : `<button type="button" class="btn-submit btn-sm btn-danger" onclick="cancelarVenda(${venda.id})">Cancelar</button>`}
            </div>
        `;
    }).join('');
}

// Atualizar prévia do total da venda
function atualizarTotalVenda() {
    const quantidade = parseInt(document.getElementById('quantidadeInput').value) || 0;
    const preco = parseFloat(document.getElementById('vendaPreco').value) || 0;
    const desconto = parseFloat(document.getElementById('vendaDesconto').value) || 0;
    const total = Math.max(0, quantidade * preco - desconto);

    document.getElementById('vendaTotalPreview').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}

// Função para cadastrar cliente
function cadastrarCliente(nome, email, telefone, endereco) {
    const idEdicao = Number(document.getElementById('clienteId').value);

    if (idEdicao) {
        const cliente = clientes.find(c => c.id === idEdicao);
        if (cliente) {
            cliente.nome = nome.trim();
            cliente.email = email ? email.trim() : '';
            cliente.telefone = telefone ? telefone.trim() : '';
            cliente.endereco = endereco ? endereco.trim() : '';
        }
    } else {
        clientes.push({
            id: proximoId(clientes),
            nome: nome.trim(),
            email: email ? email.trim() : '',
            telefone: telefone ? telefone.trim() : '',
            endereco: endereco ? endereco.trim() : ''
        });
    }

    document.getElementById('clienteForm').reset();
    document.getElementById('clienteId').value = '';
    salvarDados();
    carregarClientes();
    popularSelects();
    return true;
}

// Função para cadastrar produto
function cadastrarProduto(nome, unidade) {
    const idEdicao = Number(document.getElementById('produtoId').value);

    if (idEdicao) {
        const produto = produtos.find(p => p.id === idEdicao);
        if (produto) {
            produto.nome = nome.trim().toUpperCase();
            produto.unidade = unidade || 'UN';
        }
    } else {
        produtos.push({
            id: proximoId(produtos),
            nome: nome.trim().toUpperCase(),
            unidade: unidade || 'UN',
            preco: 0,
            estoque: 0,
            min_stock: 5,
            descricao: ''
        });
    }

    document.getElementById('produtoForm').reset();
    document.getElementById('produtoId').value = '';
    salvarDados();
    carregarProdutos();
    popularSelects();
    popularSelectEstoque();
    atualizarDashboard();
    return true;
}

// Função para lançar venda
function lancarVenda(produtoId, clienteId, quantidade, precoUnitario, desconto, pagamento, observacao) {
    // Encontrar produto e cliente
    const produto = produtos.find(p => p.id === produtoId);
    const cliente = clientes.find(c => c.id === clienteId);
    
    if (!produto || !cliente) {
        alert('Produto ou cliente não encontrado.');
        return false;
    }
    
    // Verificar estoque
    if (produto.estoque < quantidade) {
        alert('Erro: Estoque insuficiente para realizar a venda.\nEstoque disponível: ' + produto.estoque);
        return false;
    }

    const subtotal = precoUnitario * quantidade;
    if (desconto > subtotal) {
        alert('O desconto não pode ser maior que o subtotal do pedido.');
        return false;
    }

    const total = Math.max(0, subtotal - desconto);
    const dataVenda = new Date().toISOString();
    
    // Inserir venda
    const novaVenda = {
        id: proximoId(vendas),
        produto_id: produtoId,
        cliente_id: clienteId,
        produto_nome: produto.nome,
        unidade: produto.unidade || 'UN',
        cliente_nome: cliente.nome,
        quantidade: quantidade,
        preco_unitario: precoUnitario,
        desconto: desconto,
        total: total,
        pagamento: pagamento,
        situacao: 'concluida',
        observacao: observacao ? observacao.trim() : '',
        data: dataVenda
    };
    
    vendas.push(novaVenda);
    
    // Atualizar estoque
    produto.estoque -= quantidade;
    salvarDados();
    
    carregarVendas();
    carregarProdutos();
    popularSelects();
    popularSelectEstoque();
    atualizarDashboard();
    
    return true;
}

// Renderizar o estoque geral detalhado em linhas
function renderEstoqueGeral() {
    const tbody = document.querySelector('#estoqueGeralTable tbody');
    if (!tbody) return;

    if (produtos.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Nenhum produto cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = produtos.map(produto => {
        const saldo = parseInt(produto.estoque) || 0;
        const ultima = [...movimentos].reverse().find(m => m.produto_id === produto.id);
        const ultimaData = ultima
            ? new Date(ultima.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            : '—';
        const situacao = saldo > 0
            ? '<span class="badge badge-concluida">Disponível</span>'
            : '<span class="badge badge-cancelada">Sem estoque</span>';

        return `
            <tr>
                <td>${produto.id}</td>
                <td>${escapeHtml(produto.nome)}</td>
                <td>${saldo} ${produto.unidade || 'UN'}</td>
                <td>${situacao}</td>
                <td>${ultimaData}</td>
            </tr>
        `;
    }).join('');
}

// Função para atualizar dashboard
function atualizarDashboard() {
    // Faturamento (ignora vendas canceladas)
    const faturamento = vendas
        .filter(v => (v.situacao || 'concluida') !== 'cancelada')
        .reduce((total, v) => total + v.total, 0);
    document.getElementById('faturamentoValue').textContent = 'R$ ' + parseFloat(faturamento).toFixed(2).replace('.', ',');
    
    // Total de unidades em estoque
    document.getElementById('totalEstoqueValue').textContent =
        produtos.reduce((total, p) => total + (parseInt(p.estoque) || 0), 0);
    
    // Total vendas concluídas
    document.getElementById('totalVendasValue').textContent =
        vendas.filter(v => (v.situacao || 'concluida') !== 'cancelada').length;

    // Total produtos
    const totalProdutos = document.getElementById('totalProdutosValue');
    if (totalProdutos) totalProdutos.textContent = produtos.length;
    
    // Alertas de estoque baixo
    const lowStockCount = produtos.filter(p => p.estoque <= p.min_stock && p.estoque > 0).length;
    const outOfStockCount = produtos.filter(p => p.estoque === 0).length;
    
    const alert = document.getElementById('lowStockAlert');
    if (lowStockCount > 0 || outOfStockCount > 0) {
        alert.classList.remove('hidden');
        let mensagem = '';
        if (outOfStockCount > 0) {
            mensagem += `${outOfStockCount} produto(s) sem estoque. `;
        }
        if (lowStockCount > 0) {
            mensagem += `${lowStockCount} produto(s) com estoque baixo.`;
        }
        alert.innerHTML = `<strong>Atenção:</strong> ${mensagem}`;
    } else {
        alert.classList.add('hidden');
    }

    renderEstoqueGeral();
}

// Event Listeners

// Login form
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const sessao = login(username, password);
    
    if (sessao) {
        usuarioAtual = sessao;
        loginContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        tabelaAtiva = 'dashboard';
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        const secaoDashboard = document.getElementById('dashboard');
        if (secaoDashboard) secaoDashboard.classList.add('active');
        const titulo = document.getElementById('pageTitle');
        if (titulo) titulo.textContent = 'Visão geral';
        atualizarBotoesAtivos();
        aplicarSessao();
        carregarClientes();
        carregarProdutos();
        carregarVendas();
        popularSelects();
        popularSelectEstoque();
        renderMovimentos(movimentos);
        renderUsuarios();
        atualizarDashboard();
        document.getElementById('ultimaAtualizacao').textContent = new Date().toLocaleDateString('pt-BR');
    } else {
        loginError.classList.remove('hidden');
        loginError.textContent = 'Usuário ou senha incorretos.';
    }
});

// Venda form
document.getElementById('vendaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const produtoId = Number(document.getElementById('produtoSelect').value);
    const clienteId = Number(document.getElementById('clienteSelect').value);
    const quantidade = parseInt(document.getElementById('quantidadeInput').value);
    const precoUnitario = parseFloat(document.getElementById('vendaPreco').value);
    const desconto = parseFloat(document.getElementById('vendaDesconto').value) || 0;
    const pagamento = document.getElementById('vendaPagamento').value;
    const observacao = document.getElementById('vendaObservacao').value;
    
    if (!produtoId || !clienteId || !quantidade) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    if (isNaN(precoUnitario) || precoUnitario < 0) {
        alert('Informe um preço unitário válido.');
        return;
    }

    const sucesso = lancarVenda(produtoId, clienteId, quantidade, precoUnitario, desconto, pagamento, observacao);

    if (sucesso) {
        document.getElementById('vendaForm').reset();
        document.getElementById('quantidadeInput').value = 1;
        document.getElementById('vendaDesconto').value = 0;
        atualizarTotalVenda();
    }
});

// Preencher preço unitário ao escolher o produto
document.getElementById('produtoSelect').addEventListener('change', () => {
    const produtoId = Number(document.getElementById('produtoSelect').value);
    const produto = produtos.find(p => p.id === produtoId);

    if (produto) {
        document.getElementById('vendaPreco').value = Number(produto.preco || 0).toFixed(2);
    }

    atualizarTotalVenda();
});

['quantidadeInput', 'vendaPreco', 'vendaDesconto'].forEach((id) => {
    document.getElementById(id).addEventListener('input', atualizarTotalVenda);
});

// Ordenação da lista de produtos
const ordenacaoSelect = document.getElementById('produtosOrdenacao');
if (ordenacaoSelect) {
    ordenacaoSelect.addEventListener('change', () => {
        ordenacaoProdutos = ordenacaoSelect.value;
        carregarProdutos();
    });
}

// Estoque form
document.getElementById('estoqueForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const produtoId = Number(document.getElementById('estoqueProdutoSelect').value);
    const tipo = document.getElementById('estoqueTipo').value;
    const quantidade = parseInt(document.getElementById('estoqueQuantidade').value);
    const motivo = document.getElementById('estoqueMotivo').value;

    if (!produtoId || !tipo || !quantidade || quantidade < 1) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    movimentarEstoque(produtoId, tipo, quantidade, motivo);
});

// Produto form
document.getElementById('produtoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('produtoNome').value;
    const unidade = document.getElementById('produtoUnidade').value;

    if (!nome) {
        alert('Informe o nome do produto.');
        return;
    }

    cadastrarProduto(nome, unidade);
});

// Cliente form
document.getElementById('clienteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('clienteNome').value;
    const email = document.getElementById('clienteEmail').value;
    const telefone = document.getElementById('clienteTelefone').value;
    const endereco = document.getElementById('clienteEndereco').value;
    
    if (!nome) {
        alert('O nome do cliente é obrigatório.');
        return;
    }
    
    cadastrarCliente(nome, email, telefone, endereco);
});

// Fechar alerta de erro ao clicar
loginError.addEventListener('click', () => {
    loginError.classList.add('hidden');
});

// Atualizar botões ativos na sidebar
function atualizarBotoesAtivos() {
    const botoes = document.querySelectorAll('.menu-btn');
    botoes.forEach(btn => btn.classList.remove('ativo'));
    
    const botaoAtivo = document.querySelector(`[data-tab="${tabelaAtiva}"]`);
    if (botaoAtivo) {
        botaoAtivo.classList.add('ativo');
    }
}

// Navegação entre abas
document.querySelectorAll('.menu-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        tabelaAtiva = btn.dataset.tab;
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        const secao = document.getElementById(tabelaAtiva);
        if (secao) secao.classList.add('active');
        atualizarBotoesAtivos();

        const titulo = document.getElementById('pageTitle');
        if (titulo && btn.dataset.title) titulo.textContent = btn.dataset.title;

        if (tabelaAtiva === 'vendas') {
            popularSelects();
            atualizarTotalVenda();
        }
        if (tabelaAtiva === 'estoque') {
            popularSelectEstoque();
            renderMovimentos(movimentos);
        }
        if (tabelaAtiva === 'usuarios') renderUsuarios();
        if (tabelaAtiva === 'dashboard') atualizarDashboard();
    });
});

// Logout
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const userLogoutBtn = document.getElementById('userLogoutBtn');

// Posiciona o dropdown fora da barra lateral (evita corte por overflow)
function posicionarDropdown() {
    if (!userMenuBtn || !userDropdown) return;

    const rect = userMenuBtn.getBoundingClientRect();
    const largura = 220;
    const margem = 8;
    const altura = userDropdown.offsetHeight || 210;

    let left = rect.left;
    if (left + largura > window.innerWidth - margem) {
        left = window.innerWidth - largura - margem;
    }
    if (left < margem) left = margem;

    let top = rect.top - altura - margem;
    if (top < margem) {
        top = Math.min(rect.bottom + margem, window.innerHeight - altura - margem);
    }

    userDropdown.style.position = 'fixed';
    userDropdown.style.width = largura + 'px';
    userDropdown.style.left = left + 'px';
    userDropdown.style.top = Math.max(margem, top) + 'px';
    userDropdown.style.right = 'auto';
    userDropdown.style.bottom = 'auto';
}

if (userMenuBtn && userDropdown && userLogoutBtn) {
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const aberto = !userDropdown.classList.contains('hidden');

        if (aberto) {
            userDropdown.classList.add('hidden');
            userMenuBtn.setAttribute('aria-expanded', 'false');
            return;
        }

        userDropdown.classList.remove('hidden');
        userMenuBtn.setAttribute('aria-expanded', 'true');
        posicionarDropdown();
    });

    window.addEventListener('resize', () => {
        if (!userDropdown.classList.contains('hidden')) posicionarDropdown();
    });

    window.addEventListener('scroll', () => {
        if (!userDropdown.classList.contains('hidden')) posicionarDropdown();
    }, true);

    document.addEventListener('click', (e) => {
        if (!userDropdown.classList.contains('hidden') && !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
            userMenuBtn.setAttribute('aria-expanded', 'false');
        }
    });

    userLogoutBtn.addEventListener('click', () => {
        userDropdown.classList.add('hidden');
        userMenuBtn.setAttribute('aria-expanded', 'false');
        logout();
    });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// Tema claro/escuro
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleLabel = document.getElementById('themeToggleLabel');

function temaEscuroAtivo() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function atualizarRotuloTema() {
    if (themeToggleLabel) {
        themeToggleLabel.textContent = temaEscuroAtivo() ? 'Tema claro' : 'Tema escuro';
    }
}

function aplicarTema(tema) {
    if (tema === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    try {
        localStorage.setItem(TEMA_KEY, tema);
    } catch (e) {}

    atualizarRotuloTema();
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        aplicarTema(temaEscuroAtivo() ? 'light' : 'dark');
    });
}

atualizarRotuloTema();

// Alterar senha
const passwordModal = document.getElementById('passwordModal');
const passwordForm = document.getElementById('passwordForm');
const passwordError = document.getElementById('passwordError');

function mostrarErroSenha(mensagem) {
    if (!passwordError) return;
    passwordError.textContent = mensagem;
    passwordError.classList.remove('hidden');
}

function abrirModalSenha() {
    if (!passwordModal || !passwordForm) return;
    passwordForm.reset();
    if (passwordError) passwordError.classList.add('hidden');
    passwordModal.classList.remove('hidden');
    document.getElementById('senhaAtual').focus();
}

function fecharModalSenha() {
    if (!passwordModal) return;
    passwordModal.classList.add('hidden');
    if (passwordForm) passwordForm.reset();
    if (passwordError) passwordError.classList.add('hidden');
}

const changePasswordBtn = document.getElementById('changePasswordBtn');
if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
        if (userDropdown) userDropdown.classList.add('hidden');
        if (userMenuBtn) userMenuBtn.setAttribute('aria-expanded', 'false');
        abrirModalSenha();
    });
}

const passwordModalClose = document.getElementById('passwordModalClose');
if (passwordModalClose) passwordModalClose.addEventListener('click', fecharModalSenha);

if (passwordModal) {
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) fecharModalSenha();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && passwordModal && !passwordModal.classList.contains('hidden')) {
        fecharModalSenha();
    }
});

if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!usuarioAtual) return;

        const usuario = usuarios.find(u => Number(u.id) === Number(usuarioAtual.id));
        if (!usuario) {
            mostrarErroSenha('Usuário não encontrado.');
            return;
        }

        const senhaAtual = document.getElementById('senhaAtual').value;
        const novaSenha = document.getElementById('novaSenha').value;
        const confirmarSenha = document.getElementById('confirmarSenha').value;

        if (senhaAtual !== usuario.senha) {
            mostrarErroSenha('Senha atual incorreta.');
            return;
        }

        if (novaSenha.length < 4) {
            mostrarErroSenha('A nova senha deve ter pelo menos 4 caracteres.');
            return;
        }

        if (novaSenha !== confirmarSenha) {
            mostrarErroSenha('A confirmação não corresponde à nova senha.');
            return;
        }

        usuario.senha = novaSenha;
        salvarDados();
        fecharModalSenha();
        alert('Senha alterada com sucesso.');
    });
}

// Cadastro de usuários (admin)
const usuarioForm = document.getElementById('usuarioForm');
if (usuarioForm) {
    usuarioForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!usuarioAtual || usuarioAtual.perfil !== 'admin') {
            alert('Apenas administradores podem criar usuários.');
            return;
        }

        const nome = document.getElementById('usuarioNome').value.trim();
        const username = document.getElementById('usuarioUsername').value.trim();
        const senha = document.getElementById('usuarioSenha').value;
        const funcao = document.getElementById('usuarioFuncao').value;

        if (!nome || !username || !senha) {
            alert('Preencha nome, username e senha.');
            return;
        }

        if (senha.length < 4) {
            alert('A senha deve ter pelo menos 4 caracteres.');
            return;
        }

        if (usuarios.some(u => String(u.usuario).toLowerCase() === username.toLowerCase())) {
            alert('Este username já está em uso.');
            return;
        }

        usuarios.push({
            id: proximoId(usuarios),
            nome: nome,
            usuario: username,
            senha: senha,
            perfil: funcao === 'admin' ? 'admin' : 'operador'
        });

        salvarDados();
        usuarioForm.reset();
        renderUsuarios();
        alert('Usuário criado com sucesso.');
    });
}

// Alternar visibilidade da barra lateral pelo logo
const SIDEBAR_KEY = 'nexuserp_sidebar';
const dashboardBody = document.querySelector('.dashboard-body');
const sidebarLogo = document.getElementById('sidebarLogo');

function aplicarEstadoSidebar(recolhida) {
    if (!dashboardBody) return;
    dashboardBody.classList.toggle('sidebar-collapsed', recolhida);

    if (sidebarLogo) {
        sidebarLogo.setAttribute('aria-expanded', String(!recolhida));
        sidebarLogo.setAttribute('aria-label', recolhida ? 'Mostrar barra lateral' : 'Recolher barra lateral');
        sidebarLogo.title = recolhida ? 'Mostrar barra lateral' : 'Recolher barra lateral';
    }
}

function alternarSidebar() {
    if (!dashboardBody) return;
    const recolhida = !dashboardBody.classList.contains('sidebar-collapsed');
    aplicarEstadoSidebar(recolhida);
    localStorage.setItem(SIDEBAR_KEY, recolhida ? 'collapsed' : 'expanded');
}

if (dashboardBody && sidebarLogo) {
    aplicarEstadoSidebar(localStorage.getItem(SIDEBAR_KEY) === 'collapsed');
    sidebarLogo.addEventListener('click', alternarSidebar);
}

// Inicializar aplicação quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    inicializarDados();
    normalizarIds();
    atualizarBotoesAtivos();
    atualizarDashboard();
    
    // Definir variáveis globais para uso nos botões inline
    window.editarCliente = function(id) {
        const cliente = clientes.find(c => c.id === id);
        if (cliente) {
            document.getElementById('clienteId').value = cliente.id;
            document.getElementById('clienteNome').value = cliente.nome;
            document.getElementById('clienteEmail').value = cliente.email;
            document.getElementById('clienteTelefone').value = cliente.telefone;
            document.getElementById('clienteEndereco').value = cliente.endereco;
        }
    };
    
    window.excluirCliente = function(id) {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            clientes = clientes.filter(c => c.id !== id);
            salvarDados();
            carregarClientes();
            popularSelects();
        }
    };
    
    window.editarProduto = function(id) {
        const produto = produtos.find(p => p.id === id);
        if (produto) {
            document.getElementById('produtoId').value = produto.id;
            document.getElementById('produtoNome').value = produto.nome;
            document.getElementById('produtoUnidade').value = produto.unidade || 'UN';
        }
    };
    
    window.excluirProduto = function(id) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            produtos = produtos.filter(p => p.id !== id);
            salvarDados();
            carregarProdutos();
            popularSelects();
            popularSelectEstoque();
            atualizarDashboard();
        }
    };

    window.cancelarVenda = function(id) {
        const venda = vendas.find(v => v.id === id);

        if (!venda || venda.situacao === 'cancelada') return;

        if (!confirm('Cancelar esta venda e devolver os itens ao estoque?')) return;

        const produto = produtos.find(p => Number(p.id) === Number(venda.produto_id));
        const quantidade = parseInt(venda.quantidade) || 0;

        if (produto && quantidade > 0) {
            produto.estoque = (parseInt(produto.estoque) || 0) + quantidade;

            movimentos.push({
                id: proximoId(movimentos),
                produto_id: produto.id,
                produto_nome: produto.nome,
                unidade: produto.unidade || 'UN',
                tipo: 'entrada',
                quantidade: quantidade,
                saldo: produto.estoque,
                motivo: `Cancelamento da venda #${venda.id}`,
                data: new Date().toISOString()
            });
        }

        venda.situacao = 'cancelada';
        salvarDados();
        carregarVendas();
        carregarProdutos();
        popularSelects();
        popularSelectEstoque();
        renderMovimentos(movimentos);
        atualizarDashboard();
    };
});