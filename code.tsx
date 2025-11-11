// ====================================================================
// CONFIGURAÇÃO DO APLICATIVO (.gs)
// ====================================================================

var SPREADSHEET_ID = "1KhHS-BgDgE1iyi_OOJciRneDRJZzLTx4bML9TF4sHZM";
var SHEET_USUARIOS = "Usuarios";
var SHEET_INTERACOES = "Interações";
var SHEET_MESSAGES = "Messages";
var SHEET_COMBINACOES = 'Combinações';
var SHEET_LOCAIS = 'Locais';
var SHEET_CARGOS = 'Cargos';
var MANAGEMENT_EMAIL = "ggt.smas@prefeitura.rio";
var MANAGER_ACCOUNTS = ["GGT", "CGSIMAS"];
var PROFILE_LIMIT = 50; // Limita o número de perfis enviados para o frontend de uma vez

// Mapeamento central que traduz cabeçalhos de planilhas (normalizados) para chaves de objetos JS.
// Isso torna o código resiliente a variações nos nomes das colunas.
var normalizedHeaderToProfileKey = {
    // Planilha 'Usuarios'
    'matricula': 'matricula',
    'password': 'password',
    'requirespasswordchange': 'requiresPasswordChange',
    'name': 'name',
    'location': 'location',
    'currentposition': 'currentPosition',
    'bairro': 'bairro',
    'cargo': 'cargo',
    'email': 'email',
    'disponivelparatroca': 'disponivelParaTroca',
    'areadeinteresse': 'areaDeInteresse',
    'imageurl': 'imageUrl',
    'fotoperfil': 'imageUrl', // Nome alternativo
    'vinculacaocasncatual': 'currentPosition', // Nome alternativo

    // Planilha 'Interações'
    'timestamp': 'timestamp',
    'userid': 'userId',
    'profileid': 'profileId',
    'direction': 'direction',

    // Planilha 'Combinações'
    'id': 'id',
    'matriculausuario1': 'user1',
    'matriculausuario2': 'user2',
    'usuario1confirmou': 'user1_confirmed',
    'usuario2confirmou': 'user2_confirmed',
    'status': 'status',

    // Planilha 'Messages'
    'chatid': 'chatId',
    'sender': 'sender',
    'receiver': 'receiver',
    'text': 'text',

    // Planilha 'Locais'
    'lotacao': 'lotacao',
    'vinculacao': 'vinculacao'
};


// =========================================================================
//                         PONTO DE ENTRADA E ROTEAMENTO
// =========================================================================

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    if (!payload || !payload.action) {
      return createJsonResponse({ success: false, error: 'Ação inválida ou não fornecida.' });
    }
    var action = payload.action;

    var actions = {
      'login': handleLogin,
      'setPassword': handleSetPassword,
      'getInitialData': handleGetInitialData, // Ponto de acesso otimizado
      'swipe': handleSwipe,
      'updateProfile': handleUpdateProfile,
      'undoSwipe': handleUndoSwipe,
      'confirmSwap': handleConfirmSwap,
      'getMessages': handleGetMessages,
      'sendMessage': handleSendMessage,
      'uploadImage': handleImageUpload,
      'getLocations': handleGetLocations,
      'getCargos': handleGetCargos,
      'getBairros': handleGetBairros,
      'getConfirmedSwaps': handleGetConfirmedSwaps,
      'managerApprove': handleManagerApprove,
      'managerReject': handleManagerReject,
    };

    if (actions[action]) {
      return actions[action](payload);
    } else {
      return createJsonResponse({ success: false, error: 'Ação desconhecida: ' + action });
    }
  } catch (error) {
    Logger.log(error.stack);
    return createJsonResponse({ success: false, error: 'Erro interno no servidor: ' + error.message });
  }
}

// =========================================================================
//                        FUNÇÕES DE MANIPULAÇÃO (HANDLERS)
// =========================================================================

function handleLogin(payload) {
  var matricula = payload.matricula;
  var password = payload.password;
  var sheetData = getSheetData(SHEET_USUARIOS, null);
  var headers = sheetData.headers;
  var data = sheetData.data;
  
  var isManager = MANAGER_ACCOUNTS.indexOf(matricula) > -1;
  
  var matriculaIndex = findHeaderIndex(headers, 'matricula');
  var passwordIndex = findHeaderIndex(headers, 'password');

  var userRow = data.find(function(row) { return row[matriculaIndex] === matricula; });

  if (userRow) {
    if (userRow[passwordIndex] === password) {
      var userProfile = createProfileObject(userRow, headers);
      userProfile.isLocked = isUserLocked(userProfile.matricula); // Verifica o status de bloqueio
      var requiresPasswordChange = userRow[passwordIndex] === '123456';
      return createJsonResponse({ success: true, userProfile: userProfile, requiresPasswordChange: requiresPasswordChange, isManager: isManager });
    }
    return createJsonResponse({ success: false, error: 'Senha inválida.' });
  }
  return createJsonResponse({ success: false, error: 'Matrícula não encontrada.' });
}

function handleSetPassword(payload) {
  var matricula = payload.matricula;
  var newPassword = payload.newPassword;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USUARIOS);
  var sheetData = getSheetData(SHEET_USUARIOS, sheet);
  var headers = sheetData.headers;
  var data = sheetData.data;
  
  var matriculaIndex = findHeaderIndex(headers, 'matricula');
  var passwordIndex = findHeaderIndex(headers, 'password');

  var rowIndex = data.findIndex(function(row) { return row[matriculaIndex] === matricula; });

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex + 2, passwordIndex + 1).setValue(newPassword);
    return createJsonResponse({ success: true });
  }
  return createJsonResponse({ success: false, error: 'Usuário não encontrado.' });
}

function handleGetInitialData(payload) {
    var startTime = new Date().getTime();
    Logger.log('[PERF] handleGetInitialData START para Matrícula: ' + payload.matricula);
    var currentUserMatricula = payload.matricula;

    // Etapa 1: Obter mapa de usuários otimizado (já calcula o 'isLocked' de forma eficiente)
    var allUsers = getUsersMap(true); 

    // Etapa 2: Ler dados de interações e combinações diretamente da planilha
    var interacoesSheetData = getSheetData(SHEET_INTERACOES, null);
    var interacoesHeaders = interacoesSheetData.headers;
    var interacoesData = interacoesSheetData.data;

    var combinacoesSheetData = getSheetData(SHEET_COMBINACOES, null);
    var combinacoesHeaders = combinacoesSheetData.headers;
    var combinacoesData = combinacoesSheetData.data;

    var processingStartTime = new Date().getTime();
    Logger.log('[PERF] Iniciando processamento dos dados...');

    var currentUserProfile = allUsers.get(currentUserMatricula);
    if (!currentUserProfile) {
        return createJsonResponse({ success: false, error: 'Usuário atual não encontrado.' });
    }

    var userIdIndex_i = findHeaderIndex(interacoesHeaders, 'userId');
    var profileIdIndex_i = findHeaderIndex(interacoesHeaders, 'profileId');
    var directionIndex_i = findHeaderIndex(interacoesHeaders, 'direction');
    var swipeHistory = interacoesData
        .filter(function(row) { return row[userIdIndex_i] === currentUserMatricula; })
        .map(function(row) {
            var swipedProfile = allUsers.get(row[profileIdIndex_i]);
            return swipedProfile ? { profile: swipedProfile, direction: row[directionIndex_i] } : null;
        })
        .filter(function(item) { return item !== null; });

    var user1Index_c = findHeaderIndex(combinacoesHeaders, 'MatriculaUsuario1');
    var user2Index_c = findHeaderIndex(combinacoesHeaders, 'MatriculaUsuario2');
    var matchedMatriculas = [];
    combinacoesData.forEach(function(row) {
        var user1 = row[user1Index_c];
        var user2 = row[user2Index_c];
        if (user1 === currentUserMatricula && matchedMatriculas.indexOf(user2) === -1) matchedMatriculas.push(user2);
        if (user2 === currentUserMatricula && matchedMatriculas.indexOf(user1) === -1) matchedMatriculas.push(user1);
    });
    
    var matches = matchedMatriculas
        .map(function(id) { return allUsers.get(id); })
        .filter(function(item) { return item !== undefined; });

    var swipedIds = swipeHistory.map(function(s) { return s.profile.matricula; });
    var currentUserInterests = (currentUserProfile.areaDeInteresse || '').split(',').filter(Boolean);

    var availableUsers = Array.from(allUsers.values()).filter(function(userProfile) {
        if (userProfile.matricula === currentUserMatricula || !userProfile.disponivelParaTroca || swipedIds.indexOf(userProfile.matricula) > -1) {
            return false;
        }
        if (userProfile.cargo !== currentUserProfile.cargo) {
            return false;
        }
        return currentUserInterests.indexOf(userProfile.bairro) > -1;
    });

    var limitedAvailableUsers = availableUsers.slice(0, PROFILE_LIMIT);

    Logger.log('[PERF] Processamento dos dados levou: ' + (new Date().getTime() - processingStartTime) + 'ms');
    var totalTime = new Date().getTime() - startTime;
    Logger.log('[PERF] handleGetInitialData END. Tempo total: ' + totalTime + 'ms');

    return createJsonResponse({
        success: true,
        availableUsers: limitedAvailableUsers,
        matches: matches,
        swipeHistory: swipeHistory
    });
}

/**
 * Verifica se um 'like' mútuo existe e, se sim, cria uma nova entrada na planilha de combinações.
 * @param {string} currentUserId - A matrícula do usuário que está fazendo o swipe agora.
 * @param {string} targetProfileId - A matrícula do usuário que está recebendo o swipe agora.
 * @returns {boolean} - Retorna true se um 'like' mútuo foi encontrado (e a combinação criada), caso contrário, false.
 */
function checkForMutualLikeAndCreateCombination(currentUserId, targetProfileId) {
    var interacoesSheetData = getSheetData(SHEET_INTERACOES, null);
    var interacoesHeaders = interacoesSheetData.headers;
    var interacoesData = interacoesSheetData.data;

    var userIdIndex = findHeaderIndex(interacoesHeaders, 'userId');
    var profileIdIndex = findHeaderIndex(interacoesHeaders, 'profileId');
    var directionIndex = findHeaderIndex(interacoesHeaders, 'direction');
    
    var hasMutualLike = interacoesData.some(function(row) {
        return row[userIdIndex] === targetProfileId && 
               row[profileIdIndex] === currentUserId && 
               row[directionIndex] === 'right';
    });

    if (hasMutualLike) {
        var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        var combinacoesSheet = spreadsheet.getSheetByName(SHEET_COMBINACOES);
        var combSheetData = getSheetData(SHEET_COMBINACOES, combinacoesSheet);
        var combHeaders = combSheetData.headers;
        
        var sortedIds = [currentUserId, targetProfileId].sort();
        var uniqueId = sortedIds[0] + '-' + sortedIds[1];
        
        var idIndex = findHeaderIndex(combHeaders, 'id');
        var combinationExists = combSheetData.data.some(function(row) { return row[idIndex] === uniqueId; });

        if (!combinationExists) {
            var combinationData = {
                'id': uniqueId,
                'MatriculaUsuario1': sortedIds[0],
                'MatriculaUsuario2': sortedIds[1],
                'Timestamp': new Date(),
                'Usuario1Confirmou': false,
                'Usuario2Confirmou': false,
                'Status': 'pending'
            };
            var newRow = createRowArray(combHeaders, combinationData);
            combinacoesSheet.appendRow(newRow);
        }
        return true; // Match encontrado
    }

    return false; // Nenhum match encontrado
}

function handleSwipe(payload) {
  var userId = payload.userId;
  var profileId = payload.profileId;
  var direction = payload.direction;
  var match = false;

  // Sempre registra a interação atual (seja 'left' ou 'right') na planilha.
  // Isso é essencial para que futuras verificações de 'match' funcionem.
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var interacoesSheet = spreadsheet.getSheetByName(SHEET_INTERACOES);
  var interacoesHeaders = getSheetData(SHEET_INTERACOES, interacoesSheet).headers;
  var interactionData = {
    'Timestamp': new Date(),
    'UserId': userId,
    'ProfileId': profileId,
    'Direction': direction
  };
  var newInteractionRow = createRowArray(interacoesHeaders, interactionData);
  interacoesSheet.appendRow(newInteractionRow);
  
  // Otimização: Só verifica e cria um 'match' se o swipe for 'right'.
  if (direction === 'right') {
    // A função agora verifica E cria a combinação se houver match.
    match = checkForMutualLikeAndCreateCombination(userId, profileId);
  }

  return createJsonResponse({ success: true, match: match });
}


function handleImageUpload(payload) {
  var matricula = payload.matricula;
  var image = payload.image;
  if (!image || image.indexOf('data:image/') !== 0) {
    return createJsonResponse({ success: false, error: 'Formato de imagem inválido.' });
  }

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USUARIOS);
    var sheetData = getSheetData(SHEET_USUARIOS, sheet);
    var headers = sheetData.headers;
    var data = sheetData.data;
    var matriculaIndex = findHeaderIndex(headers, 'matricula');
    var imageUrlIndex = findHeaderIndex(headers, 'imageUrl');
    var rowIndex = data.findIndex(function(row) { return row[matriculaIndex] === matricula; });

    if (rowIndex !== -1) {
      sheet.getRange(rowIndex + 2, imageUrlIndex + 1).setValue(image);
      return createJsonResponse({ success: true, imageUrl: image });
    } else {
      return createJsonResponse({ success: false, error: 'Usuário não encontrado.' });
    }
  } catch (error) {
    return createJsonResponse({ success: false, error: 'Erro ao salvar a imagem: ' + error.message });
  }
}

function handleUpdateProfile(payload) {
    var profile = payload.profile;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USUARIOS);
    var sheetData = getSheetData(SHEET_USUARIOS, sheet);
    var headers = sheetData.headers; // already lowercased
    var data = sheetData.data;

    var matriculaIndex = findHeaderIndex(headers, 'matricula');
    var rowIndex = data.findIndex(function(row) { return row[matriculaIndex] === profile.matricula; });

    if (rowIndex === -1) {
        return createJsonResponse({ success: false, error: 'Usuário não encontrado.' });
    }

    if (isUserLocked(profile.matricula)) {
        return createJsonResponse({ success: false, error: 'Seu perfil não pode ser alterado enquanto uma troca está sendo confirmada.' });
    }

    // Itera sobre os cabeçalhos da planilha, encontra a chave JS correspondente e atualiza
    headers.forEach(function(header, colIndex) {
        var normalizedHeader = header.replace(/[^a-z0-9]/g, '');
        var key = normalizedHeaderToProfileKey[normalizedHeader];

        // Se a chave existir no perfil recebido, atualiza a célula
        if (key && profile.hasOwnProperty(key)) {
            var valueToWrite = profile[key];
            sheet.getRange(rowIndex + 2, colIndex + 1).setValue(valueToWrite);
        }
    });

    SpreadsheetApp.flush();
    
    var updatedRow = sheet.getRange(rowIndex + 2, 1, 1, headers.length).getDisplayValues()[0];
    var updatedProfile = createProfileObject(updatedRow, headers);
    updatedProfile.isLocked = isUserLocked(updatedProfile.matricula);

    return createJsonResponse({ success: true, updatedProfile: updatedProfile });
}

function handleUndoSwipe(payload) {
    var userId = payload.userId;
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var interacoesSheet = spreadsheet.getSheetByName(SHEET_INTERACOES);
    var sheetData = getSheetData(SHEET_INTERACOES, interacoesSheet);
    var headers = sheetData.headers;
    var data = sheetData.data;
    
    var userIdIndex = findHeaderIndex(headers, 'userId');
    var profileIdIndex = findHeaderIndex(headers, 'profileId');
    var directionIndex = findHeaderIndex(headers, 'direction');

    var lastInteractionIndex = -1;
    for (var i = data.length - 1; i >= 0; i--) {
        if (data[i][userIdIndex] === userId) {
            lastInteractionIndex = i;
            break;
        }
    }

    if (lastInteractionIndex !== -1) {
        var rowToDelete = data[lastInteractionIndex];
        var swipedProfileId = rowToDelete[profileIdIndex];
        var direction = rowToDelete[directionIndex];

        interacoesSheet.deleteRow(lastInteractionIndex + 2);
        SpreadsheetApp.flush();

        if (direction === 'right') {
            var combinacoesSheet = spreadsheet.getSheetByName(SHEET_COMBINACOES);
            var combSheetData = getSheetData(SHEET_COMBINACOES, combinacoesSheet);
            var allCombinations = combSheetData.data;
            var combHeaders = combSheetData.headers;
            var user1Index = findHeaderIndex(combHeaders, 'matriculausuario1');
            var user2Index = findHeaderIndex(combHeaders, 'matriculausuario2');
            
            for (var i = allCombinations.length - 1; i >= 0; i--) {
                var user1 = allCombinations[i][user1Index];
                var user2 = allCombinations[i][user2Index];
                if ((user1 === userId && user2 === swipedProfileId) || (user1 === swipedProfileId && user2 === userId)) {
                    combinacoesSheet.deleteRow(i + 2);
                    break;
                }
            }
        }
        return createJsonResponse({ success: true });
    }
    
    return createJsonResponse({ success: false, error: 'Nenhuma ação para desfazer.' });
}

function sendSwapRequestEmail(user1, user2) {
  var subject = 'Solicitação de Troca de Lotação: ' + user1.name + ' e ' + user2.name;

  // Estilos para o card e detalhes do usuário
  var userCardStyle = 'width: 48%; background-color: #0A0E1A; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.1);';
  var userNameStyle = 'font-size: 16px; font-weight: 600; color: #f1f5f9; margin: 0;';
  var userDetailStyle = 'font-size: 13px; color: #94a3b8; margin: 4px 0 0;';

  // Estilos para o ícone de iniciais
  var userIconContainerStyle = 'width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 12px; background: linear-gradient(135deg, #818cf8, #2dd4bf);';
  var userIconTableStyle = 'width: 100%; height: 100%;';
  var userInitialStyle = 'font-family: \'Poppins\', sans-serif; font-size: 28px; font-weight: 600; color: #ffffff; text-align: center; vertical-align: middle;';

  var createUserIcon = function(user) {
    return '<div style="' + userIconContainerStyle + '">' +
             '<table border="0" cellpadding="0" cellspacing="0" style="' + userIconTableStyle + '"><tr>' +
               '<td style="' + userInitialStyle + '">' + getInitials(user.name) + '</td>' +
             '</tr></table>' +
           '</div>';
  };
  
  var contentHtml = '<p>Os seguintes servidores confirmaram mutuamente a intenção e gostariam de solicitar formalmente a análise para troca de lotação:</p>' +
                    '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;"><tr>' +
                    '<td style="' + userCardStyle + '">' +
                      createUserIcon(user1) +
                      '<p style="' + userNameStyle + '">' + user1.name + '</p>' +
                      '<p style="' + userDetailStyle + '">Mat: ' + user1.matricula + '</p>' +
                      '<p style="' + userDetailStyle + '">' + user1.cargo + '</p>' +
                      '<p style="' + userDetailStyle + '">' + user1.location + '</p>' +
                    '</td>' +
                    '<td style="width: 4%;"></td>' +
                    '<td style="' + userCardStyle + '">' +
                      createUserIcon(user2) +
                      '<p style="' + userNameStyle + '">' + user2.name + '</p>' +
                      '<p style="' + userDetailStyle + '">Mat: ' + user2.matricula + '</p>' +
                      '<p style="' + userDetailStyle + '">' + user2.cargo + '</p>' +
                      '<p style="' + userDetailStyle + '">' + user2.location + '</p>' +
                    '</td>' +
                    '</tr></table>' +
                    '<p style="margin-top: 24px; font-size: 14px;">Por favor, entrem em contato com os envolvidos para dar andamento ao processo.</p>';

  var htmlBody = createHtmlEmailBody('Nova Solicitação de Troca', contentHtml);

  MailApp.sendEmail({
    to: MANAGEMENT_EMAIL,
    subject: subject,
    htmlBody: htmlBody
  });
}

function handleConfirmSwap(payload) {
  var userId = payload.userId;
  var partnerId = payload.partnerId;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var combinacoesSheet = ss.getSheetByName(SHEET_COMBINACOES);
  var sheetData = getSheetData(SHEET_COMBINACOES, combinacoesSheet);
  var headers = sheetData.headers;
  var data = sheetData.data;
  
  var user1Index = findHeaderIndex(headers, 'MatriculaUsuario1');
  var user2Index = findHeaderIndex(headers, 'MatriculaUsuario2');
  var user1ConfirmedIndex = findHeaderIndex(headers, 'Usuario1Confirmou');
  var user2ConfirmedIndex = findHeaderIndex(headers, 'Usuario2Confirmou');
  var statusIndex = findHeaderIndex(headers, 'Status');

  var rowIndex = data.findIndex(function(row) {
    return (row[user1Index] === userId && row[user2Index] === partnerId) ||
           (row[user1Index] === partnerId && row[user2Index] === userId);
  });

  if (rowIndex === -1) return createJsonResponse({ success: false, error: 'Combinação não encontrada.' });

  var row = data[rowIndex];
  var isUser1 = row[user1Index] === userId;
  var confirmedIndexToUpdate = isUser1 ? user1ConfirmedIndex : user2ConfirmedIndex;
  
  combinacoesSheet.getRange(rowIndex + 2, confirmedIndexToUpdate + 1).setValue(true);
  
  var usuariosSheet = ss.getSheetByName(SHEET_USUARIOS);
  var userSheetData = getSheetData(SHEET_USUARIOS, usuariosSheet);
  var userHeaders = userSheetData.headers;
  var usersData = userSheetData.data;
  var matriculaIndex = findHeaderIndex(userHeaders, 'matricula');
  var disponivelIndex = findHeaderIndex(userHeaders, 'disponivelParaTroca');
  var userRowIndex = usersData.findIndex(function(r) { return r[matriculaIndex] === userId; });
  if (userRowIndex !== -1) {
      usuariosSheet.getRange(userRowIndex + 2, disponivelIndex + 1).setValue(false);
  }
  
  SpreadsheetApp.flush();

  var updatedRow = combinacoesSheet.getRange(rowIndex + 2, 1, 1, combinacoesSheet.getLastColumn()).getDisplayValues()[0];
  var bothConfirmed = toBoolean(updatedRow[user1ConfirmedIndex]) && toBoolean(updatedRow[user2ConfirmedIndex]);
  
  if (bothConfirmed && updatedRow[statusIndex] === 'pending') {
    combinacoesSheet.getRange(rowIndex + 2, statusIndex + 1).setValue('confirmed');
    
    var usersMap = getUsersMap(true);
    var user1Profile = usersMap.get(updatedRow[user1Index]);
    var user2Profile = usersMap.get(updatedRow[user2Index]);
    
    if(user1Profile && user2Profile) sendSwapRequestEmail(user1Profile, user2Profile);
  }
  return createJsonResponse({ success: true });
}

function handleGetMessages(payload) {
  var chatId = payload.chatId;
  var sheetData = getSheetData(SHEET_MESSAGES, null);
  var headers = sheetData.headers;
  var data = sheetData.data;
  
  var chatIdIndex = findHeaderIndex(headers, 'chatId');
  var messages = data
    .filter(function(row) { return row[chatIdIndex] === chatId; })
    .map(function(row) { return createObjectFromRow(row, headers); });

  var combSheetData = getSheetData(SHEET_COMBINACOES, null);
  var combHeaders = combSheetData.headers;
  var combData = combSheetData.data;
  
  var user1Index = findHeaderIndex(combHeaders, 'MatriculaUsuario1');
  var user2Index = findHeaderIndex(combHeaders, 'MatriculaUsuario2');
  var user1ConfirmedIndex = findHeaderIndex(combHeaders, 'Usuario1Confirmou');
  var user2ConfirmedIndex = findHeaderIndex(combHeaders, 'Usuario2Confirmou');
  var statusIndex = findHeaderIndex(combHeaders, 'Status');
  
  var chatIds = chatId.split('-');
  var u1 = chatIds[0];
  var u2 = chatIds[1];
  
  var combinationRow = combData.find(function(row) {
    return (row[user1Index] === u1 && row[user2Index] === u2) ||
           (row[user1Index] === u2 && row[user2Index] === u1);
  });

  var swapStatus = null;
  if (combinationRow) {
      swapStatus = {
        user1: combinationRow[user1Index], user2: combinationRow[user2Index],
        user1_confirmed: toBoolean(combinationRow[user1ConfirmedIndex]),
        user2_confirmed: toBoolean(combinationRow[user2ConfirmedIndex]),
        status: combinationRow[statusIndex]
      };
  }
  return createJsonResponse({ messages: messages, swapStatus: swapStatus });
}

function handleSendMessage(payload) {
  var senderMatricula = payload.senderMatricula;
  var receiverMatricula = payload.receiverMatricula;
  var text = payload.text;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MESSAGES);
  var chatId = [senderMatricula, receiverMatricula].sort().join('-');

  // Constrói a linha dinamicamente para evitar erros de reordenação de colunas.
  var headers = getSheetData(SHEET_MESSAGES, sheet).headers;
  var messageData = {
    'Timestamp': new Date(),
    'ChatId': chatId,
    'Sender': senderMatricula,
    'Receiver': receiverMatricula,
    'Text': text
  };
  var newRow = createRowArray(headers, messageData);
  sheet.appendRow(newRow);
  
  return createJsonResponse({ success: true });
}

function handleGetLocations(_) {
    try {
        var sheetData = getCachedSheetData(SHEET_LOCAIS, 'locais_data', 3600);
        var headers = sheetData.headers;
        var data = sheetData.data;
        var locations = data.map(function(row) {
            return createObjectFromRow(row, headers);
        }).filter(function(loc) {
            return loc.lotacao;
        });
        return createJsonResponse(locations);
    } catch (error) {
        return createJsonResponse({ success: false, error: 'Erro ao buscar locais: ' + error.message });
    }
}

function handleGetCargos(_) {
    var sheetData = getCachedSheetData(SHEET_CARGOS, 'cargos_data', 3600);
    var data = sheetData.data;
    var cargos = data.map(function(row) {
        return row[0];
    }).filter(Boolean);
    return createJsonResponse(cargos);
}

function handleGetBairros(_) {
    var sheetData = getCachedSheetData(SHEET_LOCAIS, 'locais_data', 3600);
    var headers = sheetData.headers;
    var data = sheetData.data;
    var bairroIndex = findHeaderIndex(headers, 'bairro');
    var bairros = data.map(function(row) {
        return row[bairroIndex];
    }).filter(function(value, index, self) {
        return Boolean(value) && self.indexOf(value) === index;
    });
    return createJsonResponse(bairros.sort());
}

// =========================================================================
//                             HANDLERS DE GERENTE
// =========================================================================

function handleGetConfirmedSwaps(_) {
    var combSheetData = getSheetData(SHEET_COMBINACOES, null);
    var combHeaders = combSheetData.headers;
    var combData = combSheetData.data;
    var statusIndex = findHeaderIndex(combHeaders, 'status');
    var idIndex = findHeaderIndex(combHeaders, 'id');
    var user1Index = findHeaderIndex(combHeaders, 'matriculausuario1');
    var user2Index = findHeaderIndex(combHeaders, 'matriculausuario2');
    
    var usersMap = getUsersMap(true);

    var confirmedSwaps = combData
        .filter(function(row) { return row[statusIndex] === 'confirmed'; })
        .map(function(row) {
            var user1 = usersMap.get(row[user1Index]);
            var user2 = usersMap.get(row[user2Index]);
            if (user1 && user2) {
                return { id: row[idIndex], user1: user1, user2: user2 };
            }
            return null;
        })
        .filter(Boolean);

    return createJsonResponse(confirmedSwaps);
}

function handleManagerApprove(payload) {
    var swapId = payload.swapId;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var combinacoesSheet = ss.getSheetByName(SHEET_COMBINACOES);
    var usuariosSheet = ss.getSheetByName(SHEET_USUARIOS);

    var combSheetData = getSheetData(SHEET_COMBINACOES, combinacoesSheet);
    var combHeaders = combSheetData.headers;
    var combData = combSheetData.data;
    var idIndex = findHeaderIndex(combHeaders, 'id');
    var user1Index = findHeaderIndex(combHeaders, 'matriculausuario1');
    var user2Index = findHeaderIndex(combHeaders, 'matriculausuario2');
    var statusIndex = findHeaderIndex(combHeaders, 'status');

    var swapRowIndex = combData.findIndex(function(row) { return row[idIndex] === swapId; });
    if (swapRowIndex === -1) return createJsonResponse({ success: false, error: "Troca não encontrada." });

    var matricula1 = combData[swapRowIndex][user1Index];
    var matricula2 = combData[swapRowIndex][user2Index];

    var userSheetData = getSheetData(SHEET_USUARIOS, usuariosSheet);
    var userHeaders = userSheetData.headers;
    var usersData = userSheetData.data;
    var matriculaIdx = findHeaderIndex(userHeaders, 'matricula');
    var lotacaoIdx = findHeaderIndex(userHeaders, 'location');
    var vinculacaoIdx = findHeaderIndex(userHeaders, 'currentposition');
    var bairroIdx = findHeaderIndex(userHeaders, 'bairro');

    var user1RowIndex = usersData.findIndex(function(r) { return r[matriculaIdx] === matricula1; });
    var user2RowIndex = usersData.findIndex(function(r) { return r[matriculaIdx] === matricula2; });

    if (user1RowIndex === -1 || user2RowIndex === -1) return createJsonResponse({ success: false, error: "Um dos usuários não foi encontrado." });

    var user1Data = { lotacao: usersData[user1RowIndex][lotacaoIdx], vinculacao: usersData[user1RowIndex][vinculacaoIdx], bairro: usersData[user1RowIndex][bairroIdx] };
    var user2Data = { lotacao: usersData[user2RowIndex][lotacaoIdx], vinculacao: usersData[user2RowIndex][vinculacaoIdx], bairro: usersData[user2RowIndex][bairroIdx] };

    usuariosSheet.getRange(user1RowIndex + 2, lotacaoIdx + 1).setValue(user2Data.lotacao);
    usuariosSheet.getRange(user1RowIndex + 2, vinculacaoIdx + 1).setValue(user2Data.vinculacao);
    usuariosSheet.getRange(user1RowIndex + 2, bairroIdx + 1).setValue(user2Data.bairro);

    usuariosSheet.getRange(user2RowIndex + 2, lotacaoIdx + 1).setValue(user1Data.lotacao);
    usuariosSheet.getRange(user2RowIndex + 2, vinculacaoIdx + 1).setValue(user1Data.vinculacao);
    usuariosSheet.getRange(user2RowIndex + 2, bairroIdx + 1).setValue(user1Data.bairro);

    var finalRowsToKeep = combData.filter(function(row) {
        var currentSwapId = row[idIndex];
        if (currentSwapId === swapId) {
            row[statusIndex] = 'completed';
            return true;
        }
        var involvesUsers = row[user1Index] === matricula1 || row[user2Index] === matricula1 || row[user1Index] === matricula2 || row[user2Index] === matricula2;
        return !involvesUsers;
    });

    if (combinacoesSheet.getLastRow() > 1) {
        combinacoesSheet.getRange(2, 1, combinacoesSheet.getLastRow() - 1, combinacoesSheet.getLastColumn()).clearContent();
    }
    if (finalRowsToKeep.length > 0) {
        combinacoesSheet.getRange(2, 1, finalRowsToKeep.length, finalRowsToKeep[0].length).setValues(finalRowsToKeep);
    }
    
    // Limpa TODAS as interações dos usuários envolvidos na troca aprovada.
    clearUserInteractions([matricula1, matricula2], 'all');

    return createJsonResponse({ success: true });
}

function handleManagerReject(payload) {
    var swapId = payload.swapId;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var combinacoesSheet = ss.getSheetByName(SHEET_COMBINACOES);

    var sheetData = getSheetData(SHEET_COMBINACOES, combinacoesSheet);
    var headers = sheetData.headers;
    var data = sheetData.data;
    var idIndex = findHeaderIndex(headers, 'id');
    var user1Index = findHeaderIndex(headers, 'matriculausuario1');
    var user2Index = findHeaderIndex(headers, 'matriculausuario2');

    var swapRowIndex = data.findIndex(function(row) { return row[idIndex] === swapId; });
    if (swapRowIndex === -1) return createJsonResponse({ success: false, error: "Troca não encontrada." });

    var matricula1 = data[swapRowIndex][user1Index];
    var matricula2 = data[swapRowIndex][user2Index];
    
    combinacoesSheet.deleteRow(swapRowIndex + 2);

    var usuariosSheet = ss.getSheetByName(SHEET_USUARIOS);
    var userSheetData = getSheetData(SHEET_USUARIOS, usuariosSheet);
    var userHeaders = userSheetData.headers;
    var usersData = userSheetData.data;
    var matriculaIdx = findHeaderIndex(userHeaders, 'matricula');
    var disponivelIdx = findHeaderIndex(userHeaders, 'disponivelparatroca');

    [matricula1, matricula2].forEach(function(matricula) {
        var userRowIndex = usersData.findIndex(function(r) { return r[matriculaIdx] === matricula; });
        if (userRowIndex !== -1) {
            usuariosSheet.getRange(userRowIndex + 2, disponivelIdx + 1).setValue(true);
        }
    });
    
    // Limpa apenas as interações de 'like' (right) dos usuários, para que possam reavaliar.
    clearUserInteractions([matricula1, matricula2], 'right');

    var usersMap = getUsersMap(true);
    var user1 = usersMap.get(matricula1);
    var user2 = usersMap.get(matricula2);
    if (user1 && user2 && user1.email && user2.email) {
        var subject = "Atualização sobre sua solicitação de troca - Movimenta SIMAS";
        var contentHtml = '<p>Olá,</p>' +
                          '<p>Informamos que a solicitação de troca entre <strong>' + user1.name + '</strong> e <strong>' + user2.name + '</strong> não foi aprovada pela gerência neste momento.</p>' +
                          '<p>Seus perfis foram reativados no sistema para que possam buscar novas oportunidades. Não desanimem!</p>' +
                          '<br/><p>Atenciosamente,<br/>Equipe Movimenta SIMAS</p>';
        var htmlBody = createHtmlEmailBody("Sua Solicitação de Troca foi Atualizada", contentHtml);
        
        MailApp.sendEmail({ to: user1.email, subject: subject, htmlBody: htmlBody });
        MailApp.sendEmail({ to: user2.email, subject: subject, htmlBody: htmlBody });
    }
    
    return createJsonResponse({ success: true });
}


// =========================================================================
//                             FUNÇÕES AUXILIARES
// =========================================================================

/**
 * Limpa as interações para uma lista de matrículas com base em uma condição de direção.
 * @param {string[]} matriculas - Uma lista de matrículas de usuários.
 * @param {('all' | 'right')} directionToClear - 'all' para limpar todas as interações, 'right' para limpar apenas os 'likes'.
 */
function clearUserInteractions(matriculas, directionToClear) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var interacoesSheet = spreadsheet.getSheetByName(SHEET_INTERACOES);
    var sheetData = getSheetData(SHEET_INTERACOES, interacoesSheet);
    var headers = sheetData.headers;
    var data = sheetData.data;

    var userIdIndex = findHeaderIndex(headers, 'userId');
    var directionIndex = findHeaderIndex(headers, 'direction');

    var rowsToDelete = [];
    for (var i = 0; i < data.length; i++) {
        var userId = data[i][userIdIndex];
        var direction = data[i][directionIndex];
        if (matriculas.indexOf(userId) !== -1) {
            if (directionToClear === 'all' || (directionToClear === 'right' && direction === 'right')) {
                rowsToDelete.push(i + 2); // Armazena o número da linha para deletar
            }
        }
    }

    // Deleta as linhas de baixo para cima para evitar problemas de deslocamento de índice
    for (var j = rowsToDelete.length - 1; j >= 0; j--) {
        interacoesSheet.deleteRow(rowsToDelete[j]);
    }
}


/**
 * Cria uma matriz de linha na ordem correta dos cabeçalhos, tornando o appendRow resiliente.
 * @param {string[]} headers - A lista de cabeçalhos da planilha (ex: ['Nome', 'Matricula']).
 * @param {object} dataObject - Um objeto onde as chaves correspondem aos cabeçalhos (ex: { Nome: 'Fulano', Matricula: '123' }).
 * @returns {any[]} - Uma matriz pronta para ser usada com appendRow (ex: ['Fulano', '123']).
 */
function createRowArray(headers, dataObject) {
  var row = new Array(headers.length).fill('');
  for (var key in dataObject) {
    if (dataObject.hasOwnProperty(key)) {
      var index = findHeaderIndex(headers, key);
      if (index !== -1) {
        row[index] = dataObject[key];
      }
    }
  }
  return row;
}

function getInitials(name) {
    if (!name || typeof name !== 'string') return '';
    var parts = name.trim().split(' ').filter(Boolean);
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 1) {
        return parts[0].substring(0, 2).toUpperCase();
    } else if (parts.length === 1) {
        return parts[0][0].toUpperCase();
    }
    return '';
}

function createHtmlEmailBody(title, contentHtml) {
  var headerHtml = '<h1 style="margin: 0; font-size: 28px; font-weight: 700;">' +
                   '<span style="background: linear-gradient(to right, #818cf8, #2dd4bf); -webkit-background-clip: text; color: transparent; background-clip: text;">Movimenta</span>' +
                   '<span style="font-weight: 300; margin-left: 8px; color: #cbd5e1;">SIMAS</span></h1>';

  return  '<!DOCTYPE html><html><head><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet"></head>' +
          '<body style="margin: 0; padding: 20px; font-family: \'Poppins\', sans-serif; color: #e2e8f0;">' +
          '<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center">' +
          '<div style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #161B29; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); padding: 32px; box-sizing: border-box;">' +
          headerHtml +
          '<h2 style="font-size: 22px; font-weight: 600; color: #f1f5f9; margin-top: 24px; margin-bottom: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px;">' + title + '</h2>' +
          '<div style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">' + contentHtml + '</div>' +
          '</div></td></tr></table></body></html>';
}


function getCachedSheetData(sheetName, cacheKey, expirationInSeconds) {
    if (expirationInSeconds === undefined) {
      expirationInSeconds = 180;
    }
    var cache = CacheService.getScriptCache();
    var cachedData = cache.get(cacheKey);

    if (cachedData) {
        Logger.log('[CACHE HIT] para a chave: ' + cacheKey);
        return JSON.parse(cachedData);
    }

    Logger.log('[CACHE MISS] para a chave: ' + cacheKey + '. Lendo da planilha: ' + sheetName);
    var sheetData = getSheetData(sheetName, null);
    // Não colocar em cache dados que podem crescer muito (como interações/combinações)
    // Apenas dados pequenos e estáticos (locais, cargos) devem usar este método.
    cache.put(cacheKey, JSON.stringify(sheetData), expirationInSeconds);
    return sheetData;
}


function getSheetData(sheetName, sheet) {
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  }
  if (!sheet) throw new Error('Planilha "' + sheetName + '" não encontrada.');
  var dataRange = sheet.getDataRange();
  // Converte todos os valores de célula em strings e os apara.
  // Isso evita incompatibilidades de tipo (por exemplo, número vs. string para matrícula)
  // que era a causa raiz dos matches não serem criados.
  var values = dataRange.getDisplayValues().map(function(row) {
    return row.map(function(cell) {
      return String(cell).trim();
    });
  });
  var headers = values.length > 0 ? values.shift().map(function(h) { return h.toLowerCase(); }) : [];
  return { headers: headers, data: values };
}

var allUsersMap = null;
function getUsersMap(forceRefresh) {
    if (forceRefresh === void 0) { forceRefresh = false; }
    if (!allUsersMap || forceRefresh) {
        // Etapa 1: Ler usuários e criar mapa básico
        var userSheetData = getSheetData(SHEET_USUARIOS, null);
        var userHeaders = userSheetData.headers;
        var usersData = userSheetData.data;
        var matriculaIndex = findHeaderIndex(userHeaders, 'matricula');
        var tempMap = new Map();
        usersData.forEach(function (row) {
            var profile = createProfileObject(row, userHeaders);
            tempMap.set(row[matriculaIndex], profile);
        });

        // Etapa 2: Ler combinações UMA VEZ
        var combSheetData = getSheetData(SHEET_COMBINACOES, null);
        var combHeaders = combSheetData.headers;
        var combData = combSheetData.data;

        // Etapa 3: Identificar todos os usuários bloqueados e atualizar o mapa
        var user1Index = findHeaderIndex(combHeaders, 'matriculausuario1');
        var user2Index = findHeaderIndex(combHeaders, 'matriculausuario2');
        var user1ConfirmedIndex = findHeaderIndex(combHeaders, 'usuario1confirmou');
        var user2ConfirmedIndex = findHeaderIndex(combHeaders, 'usuario2confirmou');
        var statusIndex = findHeaderIndex(combHeaders, 'status');

        combData.forEach(function (row) {
            if (row[statusIndex] === 'pending') {
                if (toBoolean(row[user1ConfirmedIndex])) {
                    var user1 = tempMap.get(row[user1Index]);
                    if (user1) user1.isLocked = true;
                }
                if (toBoolean(row[user2ConfirmedIndex])) {
                    var user2 = tempMap.get(row[user2Index]);
                    if (user2) user2.isLocked = true;
                }
            }
        });
        allUsersMap = tempMap;
        Logger.log('[PERF] Mapa de usuários (com status de bloqueio) criado/atualizado com ' + allUsersMap.size + ' usuários.');
    }
    return allUsersMap;
}

function isUserLocked(matricula) {
    var sheetData = getSheetData(SHEET_COMBINACOES, null);
    var headers = sheetData.headers;
    var data = sheetData.data;
    var user1Index = findHeaderIndex(headers, 'matriculausuario1');
    var user2Index = findHeaderIndex(headers, 'matriculausuario2');
    var user1ConfirmedIndex = findHeaderIndex(headers, 'usuario1confirmou');
    var user2ConfirmedIndex = findHeaderIndex(headers, 'usuario2confirmou');
    var statusIndex = findHeaderIndex(headers, 'status');

    return data.some(function(row) {
        return row[statusIndex] === 'pending' &&
        (
            (row[user1Index] === matricula && toBoolean(row[user1ConfirmedIndex])) ||
            (row[user2Index] === matricula && toBoolean(row[user2ConfirmedIndex]))
        );
    });
}

function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (!value) return false;
    var upperValue = String(value).toUpperCase();
    return upperValue === 'TRUE' || upperValue === 'VERDADEIRO';
}

function createProfileObject(rowData, headers) {
  var profile = createObjectFromRow(rowData, headers);
  
  profile.disponivelParaTroca = toBoolean(profile.disponivelParaTroca);
  profile.isLocked = false; // O status de bloqueio é agora calculado por getUsersMap

  if (!profile.imageUrl) {
      profile.imageUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzUzNkU3OCI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTguNjg1IDE5LjA5N0E5LjcyMyA5LjcyMyAwIDAwMjEuNzUgMTJjMC01LjM4NS00LjM2NS05Ljc1LTkuNzUtOS43NVMxLjI1IDYuNjE1IDEuMjUgMTJhOS43MjMgOS43MjMgMCAwMDMuMDY1IDcuMDk3QTkuNzE2IDkuNzE2IDAgMDAxMiAyMS43NWE5LjcxNiA5LjcxNiAwIDAwNi42ODUtMi42NTN6bS0xMi4wNC0xLjI4NUE3LjQ4NiA3LjQ4NiAwIDAxMTIgMTVhNy40ODYgNy40ODYgMCAwMTUuODU1IDIuODEyQTguMjI0IDguMjI0IDAgMDExMiAyMC4yNWE4LjgyNCA4LjIyNCAwIDAxLTUuODU1LTIuNDM4ek0xNSA5YTMuNzUgMy43NSAwIDExLTcuNSAwIDMuNzUgMy43NSAwIDAxNy41IDB6IiBjbGlwLXJ1bge9ImV2ZW5vZGQiIC8+PC9zdmc+";
  }
  delete profile.password;
  return profile;
}

function createObjectFromRow(rowData, headers) {
    var obj = {};
    headers.forEach(function(header, index) {
        if (!header) return;
        // Normaliza o cabeçalho (que já está em minúsculas) para corresponder ao mapa
        var normalizedHeader = header.replace(/[^a-z0-9]/g, '');
        var key = normalizedHeaderToProfileKey[normalizedHeader];
        if (key) {
            // Usa a chave correta do mapa (ex: 'currentPosition')
            obj[key] = rowData[index];
        }
    });
    return obj;
}

function findHeaderIndex(headers, headerName) {
    var lowerHeaderName = String(headerName).toLowerCase().replace(/[^a-z0-9]/g, '');
    var index = headers.findIndex(function(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, '') === lowerHeaderName; });
    if (index === -1) {
        // Não lance um erro para 'Timestamp', pois pode não estar em todas as planilhas de escrita.
        if (lowerHeaderName === 'timestamp') return -1;
        throw new Error("Configuração da planilha inválida: A coluna '" + headerName + "' não foi encontrada. Cabeçalhos: [" + headers.join(', ') + "]");
    }
    return index;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}