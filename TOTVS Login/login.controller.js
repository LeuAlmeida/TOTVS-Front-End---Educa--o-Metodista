(function () {
    'use strict';

    angular.module('eduLoginModule', ['ngResource', 'ngSanitize', 'totvsHtmlFramework']);

    angular
        .module('eduLoginModule')
        .controller('EduLoginController', EduLoginController);

     angular.module('eduLoginModule')
        .config(totvsAppConfig);

    EduLoginController.$inject = ['$sce', 
        '$totvsresource', 
        '$location', 
        '$rootScope', 
        '$window', 
        '$scope', 
        'totvs.app-notification.Service',
        'i18nFilter'];

    function EduLoginController($sce, 
        $totvsresource, 
        $location, 
        $rootScope, 
        $window, 
        $scope, 
        totvsNotification, 
        i18nFilter) {

        var self = this,
            urlServicos = CONST_GLOBAL_URL_BASE_SERVICOS + 'TOTVSEducacional/:method',
            autoLoginQueryString = '?AutoLoginType=ExternalLogin';

        self.urlLoginPost = '';
        self.urlPortalCorporeNet = '';
        self.listaAlias = [];
        
        self.oauthProviders = [];
        self.oauthResponse = null;
        self.facebookProviderId = 0;

        self.aliasSelectChanged = aliasSelectChanged;
        self.exibirEsqueceuSenha = exibirEsqueceuSenha;
        self.registrarEsqueciSenha = registrarEsqueciSenha;
        self.registrarNovaSenha = registrarNovaSenha;
        self.alterarSenha = alterarSenha;
        self.exibirFromLogin = exibirFromLogin;
        self.limparFormularios = limparFormularios;
        self.validarDadosLogin = validarDadosLogin;
        self.onClickAssociarContas = onClickAssociarContas;
        self.redirecionarMobile = redirecionarMobile;

        self.alias = '';
        self.i18n = null;
        self.culture = 'pt';
        self.keyTrocaSenha = '';
        self.aliasRecover = '';
        self.mobileDetect = null;

        self.exibirFormEsqueceuSenha = false;
        self.exibirFormNovaSenha = false;
        self.exibirFormAlterarSenha = false;

        //Indica se o campo alias será exibido na tela de login
        self.exibirAlias = EDU_CONST_GLOBAL_EXIBIR_ALIAS;

        $window.efetuarLoginComFacebookCallback = externalLoginOnFacebookCallback;

        $scope.externalLogin = externalLogin;

        $scope.isNullOrWhiteSpace = isNullOrWhiteSpace;
        $scope.isNullOrUndefined = isNullOrUndefined;
        $scope.isNumeral = isNumeral;

        //Verifica o callback de um provedor externo
        verifyExternalLoginCallback();

        preInit();
        function preInit() {
            //Configurar idioma padrão da tradução
            $rootScope.currentuser = { dialect: EDU_CONST_GLOBAL_CUSTOM_IDIOMA };

            if (angular.isDefined(window.localStorage.getItem('aliasSelecionado')) && 
                window.localStorage.getItem('aliasSelecionado') != null) {
                self.alias = window.localStorage.getItem('aliasSelecionado');
            }

            verificarExibirFormularioNovaSenha();
            verificarExibirFormularioAlterarSenha();

            verificarLoginUsuarioAsync(function () {
                loadExternalProviders(loadExternalProvidersCallback);
            });

            verificaMobile();
        }

        function verificaMobile() {
            self.mobileDetect = new MobileDetect(navigator.userAgent);

            var isMobile = (self.mobileDetect.mobile() !== null) && (self.mobileDetect.tablet() === null);

            if (isMobile && (EDU_CONST_URL_EDUCAMOBILE || EDU_CONST_URL_EDUCONNECT_ANDROID || EDU_CONST_URL_EDUCONNECT_IOS)) {
                $('#modalMobileDetect').modal({backdrop: 'static', keyboard: false})
                $('#modalMobileDetect').modal('show');
            }
        }

        function redirecionarMobile() {
            if (self.mobileDetect === null) {
                self.mobileDetect = new MobileDetect(navigator.userAgent);
            }

            if (self.mobileDetect.is('AndroidOS') && EDU_CONST_URL_EDUCONNECT_ANDROID) {
                window.location.href = EDU_CONST_URL_EDUCONNECT_ANDROID;
            }
            else if (self.mobileDetect.is('iOS') && EDU_CONST_URL_EDUCONNECT_IOS) {
                window.location.href = EDU_CONST_URL_EDUCONNECT_IOS;
            }
            else if (EDU_CONST_URL_EDUCAMOBILE) {
                window.location.href = EDU_CONST_URL_EDUCAMOBILE;
            }
        }

        function loadExternalProviders(callback) {

            var urlServicos = CONST_GLOBAL_URL_BASE_SERVICOS + 'user/ExternalApps',
                HttpRequest = $totvsresource.REST(urlServicos),
                parametros = {
                    alias: self.alias
                };

            HttpRequest.TOTVSGet(parametros, callback);
        }

        function inicilizarCSSCampos() {

            $('.logo').addClass('animated fadeInDown');
            $('.logo').removeClass('hidden-box');

            $('.certificado').addClass('animated fadeInDown');
            $('.certificado').removeClass('hidden-box');

            $('.certificado-2').addClass('animated fadeInDown');
            $('.certificado-2').removeClass('hidden-box');

            $('.login-box').addClass('animated fadeInDown');
            $('.login-box').removeClass('hidden-box');

            $('input:text:visible:first').focus();

            $('#username').focus(function () {
                $('label[for="username"]').addClass('selected');
            });
            $('#username').blur(function () {
                $('label[for="username"]').removeClass('selected');
            });
            $('#password').focus(function () {
                $('label[for="password"]').addClass('selected');
            });
            $('#password').blur(function () {
                $('label[for="password"]').removeClass('selected');
            });
        }

        function consultaListaAliasDisponiveisAsync(callback) {

            var HttpRequest = $totvsresource.REST(urlServicos, { method: 'ListarAlias' });

            HttpRequest.TOTVSQuery(null, function (result) {
                if (result) {
                    self.listaAlias = result;

                    if (self.listaAlias.length > 0) {
                        if (angular.isDefined(window.localStorage.getItem('aliasSelecionado')) &&
                            window.localStorage.getItem('aliasSelecionado') !== null) {
                            self.alias = window.localStorage.getItem('aliasSelecionado');
                        }
                        else {
                            self.alias = self.listaAlias[0];
                            window.localStorage.setItem('aliasSelecionado', self.alias);
                       }
                        
                        consultarLoginURLPorAliasAsync();
                    }

                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            });
        }

        function verificarLoginUsuarioAsync(callback) {
            var HttpRequest = $totvsresource.REST(urlServicos, { method: 'Logout' });

            HttpRequest.TOTVSSave(null, function (result) {
               consultaListaAliasDisponiveisAsync(callback);
            });
        }

        function consultarLoginURLPorAliasAsync() {

            var HttpRequest = $totvsresource.REST(urlServicos, { method: 'LoginURL' });

            HttpRequest.TOTVSQuery({ alias: self.alias }, function (result) {

                if (result && result.length > 0) {
                    var redirect = $window.location.href.split('redirect=')[1];

                    if (angular.isDefined(redirect) && redirect !== '') {
                        redirect = redirect.split('&')[0];
                        redirect = 'redirect=' + redirect;
                    }

                    self.urlLoginPost = $sce.trustAsResourceUrl(result[0].URLPORTAL + EDU_CONST_URL_LOGIN_APP + autoLoginQueryString + '&' + redirect);
                    self.urlPortalCorporeNet = result[0].URLPORTAL;

                    inicilizarCSSCampos();

                    window.localStorage.setItem('aliasSelecionado', self.alias);
                } else {

                    inicilizarCSSCampos();

                    var msg = i18nFilter('l-alias-invalido').replace('*ALIAS*', self.alias);

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: msg
                    });

                    self.urlLoginPost = '';
                }
            });
        }

        function aliasSelectChanged() {
            window.localStorage.setItem('aliasSelecionado', self.alias);

            consultarLoginURLPorAliasAsync();
            loadExternalProviders(loadExternalProvidersCallback);
        }

        function exibirEsqueceuSenha(value) {
            self.exibirFormEsqueceuSenha = value;

            if (self.exibirFormEsqueceuSenha) {
                self.exibirFormNovaSenha = false;
            }

            limparFormularios();
        }

        function exibirFromLogin() {

            self.exibirFormNovaSenha = false;
            self.exibirFormEsqueceuSenha = false;
            self.exibirFormAlterarSenha = false;

            limparFormularios();
        }

        function registrarEsqueciSenha() {

            if (self.formRecover.$invalid) {

                if (self.formRecover['UserRecover'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-msg-usuario-obrigatorio')
                    });

                } else if (self.formRecover['Email'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-msg-email-obrigatorio')
                    });
                }

                return;
            }

            var HttpRequest = $totvsresource.REST(urlServicos, { method: 'RecoverPass' }),
                paramsRequest = {},
                url;

            if ($location.$$absUrl.indexOf('#') === -1) {
                url = $location.$$absUrl + '#';
            }

            paramsRequest.alias = self.alias;
            paramsRequest.usuario = self.userRecover;
            paramsRequest.email = self.emailRecover;
            paramsRequest.url = url;

            HttpRequest.TOTVSGet(paramsRequest, function (result) {

                if (result.value) {
                    exibirEsqueceuSenha(false);
                }
            });
        }

        function verificarExibirFormularioNovaSenha() {
            if ($location.$$hash.includes('?K=') && $location.$$hash.includes('&Alias=')) {

                var parametroK = getUrlParam('K');
                var parametroAlias = getUrlParam('Alias');

                if (parametroK > "") {
                    self.keyTrocaSenha = parametroK;
                }

                if (parametroAlias > "") {
                    self.aliasRecover = parametroAlias;
                }

                self.exibirFormNovaSenha = true;
                self.exibirFormEsqueceuSenha = false;
                self.exibirFormAlterarSenha = false;
            }
        }

        function getUrlParam(name) {
            var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec($location.$$hash);
            return (results && results[1]) || undefined;
        }

        function verificarExibirFormularioAlterarSenha() {
            var isChangePass = $window.location.search.indexOf('cpsw'),
                noMessagem = $window.location.search.indexOf('noMessage');
            if (isChangePass !== -1) {
                self.exibirFormAlterarSenha = true;

                self.exibirFormNovaSenha = false;
                self.exibirFormEsqueceuSenha = false;

                // O parâmetro noMessage só é passado quando não é pra exibir a mensagem, portanto
                // se não for encontrato, a mensagem deve ser exibida.
                if (noMessagem === -1) {
                    totvsNotification.notify({
                        type: 'warning',
                        title: i18nFilter('l-senha-expirada-title'),
                        detail: i18nFilter('l-senha-expirada')
                    });
                }
            }
        }

        function registrarNovaSenha() {

            if (self.formNewPassword.$invalid) {

                if (self.formNewPassword['PassRecover'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-senha1')
                    });

                } else if (self.formNewPassword['PassRecover2'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-senha2')
                    });
                }

                return;
            }

            if (self.novaSenha !== self.novaSenha2) {
                totvsNotification.notify({
                    type: 'error',
                    title: i18nFilter('l-Atencao'),
                    detail: i18nFilter('l-msg-senhas-nao-coincidem')
                });

                return;
            }

            var HttpRequest = $totvsresource.REST(urlServicos, { method: 'RegisterNewPass' }),
                paramsRequest = {};

            paramsRequest.key = self.keyTrocaSenha;
            paramsRequest.novaSenha = self.novaSenha;
            paramsRequest.novaSenha2 = self.novaSenha2;
            paramsRequest.alias = self.aliasRecover;

            HttpRequest.TOTVSGet(paramsRequest, function (result) {

                if (result.value) {
                    exibirFromLogin(true);
                }
            });
        }

        function alterarSenha() {
            if (self.formAlterarSenha.$invalid) {

                if (self.formAlterarSenha['usuario'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-usuario')
                    });

                }
                else if (self.formAlterarSenha['OldPass'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-senha-antiga')
                    });

                }
                else if (self.formAlterarSenha['PassRecover'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-senha1')
                    });

                } else if (self.formAlterarSenha['PassRecover2'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-senha2')
                    });
                }

                return;
            }

            if (self.novaSenha !== self.novaSenha2) {
                totvsNotification.notify({
                    type: 'error',
                    title: i18nFilter('l-Atencao'),
                    detail: i18nFilter('l-msg-senhas-nao-coincidem')
                });

                self.novaSenha = '';
                self.novaSenha2 = '';

                return;
            }

            var HttpRequest = $totvsresource.REST(urlServicos, { method: 'ChangePass' }),
                paramsRequest = {};

            paramsRequest.usuario = self.usuario;
            paramsRequest.antigaSenha = self.antigaSenha;
            paramsRequest.novaSenha = self.novaSenha;
            paramsRequest.novaSenha2 = self.novaSenha2;

            HttpRequest.TOTVSGet(paramsRequest, function (result) {

                if (result.value) {
                    $window.location.href = $window.location.origin + $window.location.pathname;
                }
            });
        }

        function validarDadosLogin() {

            if (self.formLogin.$invalid) {

                if (self.formLogin['User'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-msg-usuario-obrigatorio')
                    });

                } else if (self.formLogin['Pass'].$invalid) {

                    totvsNotification.notify({
                        type: 'error',
                        title: i18nFilter('l-Atencao'),
                        detail: i18nFilter('l-msg-senha-obrigatorio')
                    });
                }

                return;
            }
        }

        function limparFormularios() {

            self.user = '';
            self.pass = '';

            self.userRecover = '';
            self.emailRecover = '';

            self.usuario = '';
            self.antigaSenha = '';
            self.novaSenha = '';
            self.novaSenha2 = '';
        }

                
        function showModalLoginForMatch(exibir) {

            if (exibir) {
                $('#modalLogin').modal('show');

                $('#modalLogin').on('shown.bs.modal', function (e) {
                    $('#User2').focus();
                });
            } else {
                $('#modalLogin').modal('hide');
            }
        }

        function onClickAssociarContas() {

            if (self.formLogin.$invalid) {
                validarDadosLogin();
            }
            else {
                var parametros = {
                    alias: self.oauthResponse.alias,
                    accessToken: self.oauthResponse.accessToken,
                    providerId: self.oauthResponse.providerId,
                    user: $scope.user,
                    password: $scope.pass
                }

                externalLoginAndMatchOnRM(parametros);
            }
        }

        function externalLoginOnFacebookCallback() {

            FB.getLoginStatus(function (response) {

                if (response.status === 'connected') 
                {
                    var parametros = {
                        alias: self.alias,
                        accessToken: response.authResponse.accessToken,
                        providerId: self.facebookProviderId,
                    };

                    externalLoginOnRM(parametros)
                }

                $scope.$apply();
            });
        }

        function loadExternalProvidersCallback(result) {

            if (result.oauthProviders) {

                self.oauthProviders = result.oauthProviders;
                
                var face = null;

                // Tem que ser assim por causa do IE que não aceita o .find...
                for (var i = 0; i < self.oauthProviders.length; i++) {
                    if(self.oauthProviders[i].Type === 1)
                    {
                        face = self.oauthProviders[i];
                        break;
                    }
                }

                if (face) {
                    //Armazena o id para fazer o a comunicação com o RM
                    self.facebookProviderId = face.Id;

                    //Inicializar Facebook SDK
                    FB.init({
                        appId: face.ClientId,
                        cookie: true,
                        xfbml: true,
                        version: 'v2.9'
                    });
                }

                var google = null;

                // Tem que ser assim por causa do IE que não aceita o .find...
                for (var i = 0; i < self.oauthProviders.length; i++) {
                    if (self.oauthProviders[i].Type === 2) {
                        google = self.oauthProviders[i];
                        break;
                    }
                }

                if (google) {
                    google.ImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJbSURBVEhLYxje4F89A9+/fMZJ/2KZHv3zYvz135Hh/38nhv//fBl//Ytjuv+viLH/fz0DB1Q5aeBfIWPfP2/G3/9tgYbiwWDLihnbodoIg/9pDKz/EpnOYTMMJ7YDWpTDtBlqBH7wL5lEw4EY7NNqFhuoEbgBMEx7MAxwABqQwHTlXwlT6r9MBllgvIj9q2CK/5fCdBEsR6zh/68wsP0rZ36PbPg/N4a//0qZIqFKMABQLpwow0Hg30HW8P8H2f//n8r6/78r0AJQuBYxhUOlKQf/DrIvA1sAwhvY/v8vYzoAlaIO+HeA/SbcAiD+d4jTHCqFAiTLLv0nhO2b1n+BKkcAoAWfUCzYycANlUIB2AxExyqVx/9BlSMANS1QrDiF1QKqBZFJ3c6fUOUIAIzkpTDDj++W+9+y1eIcVIogiOyecRPZguCO+Q+gUgjw7wBr2J+DHP/n7dD777s+4L/fev//07YZRkClcYK6qWWJMuUXUHyQN7F1IlQaAUAZrWWLxWcfoOEwHL7B6++0HQZRUCUYoHdxdIxm1eF/yIbr1ez73b2oGGv8MUzeZtiFbAEI+wN9UrnJ9trcrYaJa48qiS3dryYyY4d+ItAx1wM3+P2PndKK5vq2Lqhx2EHjFquz6JYQwslzi/7LVZz7H9Mz/QzUGNxg/34GloYtVmewGYQLg+KsYUXIofr6UDaoMYTBlO0GHXEbPH9jMxAZJ25w/zV5m0EzVBtpYNV+LZ7JW436KjbZPYjf4PEraIPv/5D1vv+TN7r9rNlic2/KNoPeTWckuaDKhyVgYAAAPgJAFtrp7gAAAAAASUVORK5CYII=";
                    var googleCustomize = {
                            BackGroundColor: 'rgba(255,255,255,1)',
                            BorderColor: 'rgba(248,249,250,1)',
                            ForeColor: 'rgba(117,117,117,1)',
                            
                            Text: i18nFilter('l-botao-acesse-Google'),
                            ImageInBackGround: 0,
                            TextBeforeImage: 0
                        };
                    google.CustomizeEntity = googleCustomize; 
                }
                                
                for (var i = 0; i < self.oauthProviders.length; i++) {
                    self.oauthProviders[i]['_styleStr'] = getStyleStringForProvider(self.oauthProviders[i]);
                }                       
            }
            else {
                self.oauthProviders = [];
            }
        }

        function externalLogin(providerId)
        {
            var prov = null;

            // Tem que ser assim por causa do IE que não aceita o .find...
            for (var i = 0; i < self.oauthProviders.length; i++) {
                if (self.oauthProviders[i].Id === providerId) {
                    prov = self.oauthProviders[i];
                    break;
                }
            }
            
            var redirect_uri = location.protocol + "//" + location.host + EDU_CONST_GLOBAL_URL_BASE_APP + 'login/';

            var settings = {
                authority: prov.DiscoveryEndpoint, 
                client_id: prov.ClientId, 
                redirect_uri: redirect_uri,
                post_logout_redirect_uri: redirect_uri,
                response_type: 'token',
                scope: prov.DefaultScope || 'openid email',
                filterProtocolClaims: true,
                loadUserInfo: false,
            };
            
            var client = new Oidc.OidcClient(settings);

            client.createSigninRequest({ state: { alias: self.alias, providerId: providerId } })
                .then(function(req) {
                    window.location = req.url;
                })
                .catch(function(err) {
                    console.error(err);
                });
        }

        function externalLoginCallback() {
            new Oidc.OidcClient().processSigninResponse()
                .then(function(response) {
                    var parametros = {
                        alias: response.state.alias,
                        accessToken: response.access_token,
                        providerId: response.state.providerId
                    };

                    externalLoginOnRM(parametros);

                }).catch(function(err) {
                    console.log(err);
                });
        }

        function verifyExternalLoginCallback() {
            if (window.location.href.indexOf("#") >= 0) {
                externalLoginCallback();
            }
        }

        function externalLoginOnRM(parametros) {
            self.oauthResponse = parametros;

            var HttpRequest = $totvsresource.REST(urlServicos, { method: 'ExternalLogin' });
            HttpRequest.TOTVSSave({}, parametros, function (result) {
                if (result.StatusDescription === 'LoginOK') {

                    //caso o login seja efetuado com sucesso
                    location.href = EDU_CONST_GLOBAL_URL_BASE_APP;
                }
                else if (result.StatusDescription === 'ExternalApplicationUserNotIdentified') {

                    //caso não seja localizado usuário no RM baseado na conta do facebook
                    //exibe modal para vincular conta RM à conta do Facebook
                    showModalLoginForMatch(true);
                }
            });
        }

        function externalLoginAndMatchOnRM(parametros) {
            var HttpRequest = $totvsresource.REST(urlServicos, { method: 'ExternalLoginWithMatch' });
            HttpRequest.TOTVSSave({}, parametros, function (result) {
                if (result.StatusDescription === 'LoginOK') {

                    //caso o login seja efetuado com sucesso
                    location.href = EDU_CONST_GLOBAL_URL_BASE_APP;
                }
            });
        }
    }

    // Custom Buttons
    function getStyleStringForProvider(providerEl){
        var style_Str = "";
        
        if (!isNullOrUndefined(providerEl.CustomizeEntity)) {
            if ((isNumeral(providerEl.CustomizeEntity.ImageInBackGround) && providerEl.CustomizeEntity.ImageInBackGround == 0) || providerEl.CustomizeEntity.ImageInBackGround == false) {
                if (isNumeral() || !isNullOrWhiteSpace(providerEl.CustomizeEntity.BackGroundColor))
                    style_Str += "'background-color': " + toColor(providerEl.CustomizeEntity.BackGroundColor) + ",";

                if (isNumeral() || !isNullOrWhiteSpace(providerEl.CustomizeEntity.ForeColor))
                    style_Str += "'color': " + toColor(providerEl.CustomizeEntity.ForeColor) + ",";

                if (isNumeral() || !isNullOrWhiteSpace(providerEl.CustomizeEntity.BorderColor))
                    style_Str += "'border': '1px solid', 'border-color': " + toColor(providerEl.CustomizeEntity.BorderColor) + ",";
            }

            if ((isNumeral(providerEl.CustomizeEntity.ImageInBackGround) && providerEl.CustomizeEntity.ImageInBackGround == 1) || providerEl.CustomizeEntity.ImageInBackGround == true) {
                if (!isNullOrWhiteSpace(providerEl.ImageBase64))
                    style_Str = "'background': 'no-repeat center/100% 100% url(data:image/png;base64," + providerEl.ImageBase64 + ")', 'min-height':'52px'"
            }
        }
        else {
            style_Str += "'border': '1px solid'";
        }

        return "{ " + style_Str + " }";
    }

    function isNullOrWhiteSpace(value){
        return (typeof(value) === "string" && (value == "" || value == " "));
    }

    function isNumeral(value){
        return (typeof(value) === "number");
    }

    function isNullOrUndefined(value){
        return (typeof(value) === "undefined") || value == null;
    }

    function toColor(exp) {
        if (!isNullOrWhiteSpace(exp) && exp.indexOf("rgba(") < 0) {
            exp >>>= 0;
            var b = exp & 0xFF,
                g = (exp & 0xFF00) >>> 8,
                r = (exp & 0xFF0000) >>> 16,
                a = ((exp & 0xFF000000) >>> 24) / 255;
            return "'rgba(" + [r, g, b, a].join(",") + ")'";
        }
        else
            return "'" + exp + "'";
    }

    // Custom Buttons
    totvsAppConfig.$inject = ['$httpProvider', 'TotvsI18nProvider', '$locationProvider'];
    function totvsAppConfig($httpProvider, TotvsI18nProvider, $locationProvider) {

        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        });

        $httpProvider.interceptors.push('totvsHttpInterceptor');

        TotvsI18nProvider.setBaseContext(EDU_CONST_GLOBAL_URL_BASE_APP);
    }

    angular.bootstrap(document, ['eduLoginModule']);
})();