
# 📆 NestJS Google Calendar Backend

Backend Node.js com NestJS para consultar disponibilidade de um usuário via Google Calendar API e criar eventos.

## Tecnologias

* **NestJS** – (https://docs.nestjs.com/)
* **googleapis** – client oficial Google para Node.js (https://googleapis.dev/nodejs/googleapis/latest/calendar/classes/Calendar.html)

## Funcionalidades

* Autenticação via OAuth2 com o Google.
* Consulta de eventos da semana atual.
* Criação de eventos no Google Calendar do usuário.

## Configuração (.env)

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/redirect
```

* `GOOGLE_REDIRECT_URI` deve ser permitido nos credenciais OAuth2 do Google.

## Endpoints

* **GET /authenticate**
  Inicia o fluxo OAuth2. Redireciona o usuário à tela de consentimento Google.

* **GET /redirect**
  Callback OAuth2. Recebe `code`, troca por `tokens` e armazena sessão do usuário.

* **GET /week**
  Consulta eventos da semana atual usando `calendar.events.list()`. Exemplo de scopo: `https://www.googleapis.com/auth/calendar.readonly` ([googleapis.dev][3], [joshuaakanetuk.com][4])

* **POST /create**
  Cria um evento no calendar do usuário com dados via JSON (título, start, end, descrição, convidados). Usa `calendar.events.insert()`&#x20;

## Exemplo de uso dos módulos NestJS

```ts
// google.service.ts
import { google } from 'googleapis';
@Injectable()
export class GoogleService {
  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events', 
          'https://www.googleapis.com/auth/calendar.readonly',
      ],
    });
  }

  async handleRedirect(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  getCalendar() {
    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async getWeekEvents() {
    const cal = this.getCalendar();
    // cálculo de início e fim da semana atual
    return cal.events.list({ … });
  }

  async createEvent(dto) {
    const cal = this.getCalendar();
    return cal.events.insert({ …, requestBody: dto });
  }
}
```

Visite `http://localhost:3000/authenticate` para iniciar o login Google. Após aceitar, será redirecionado para `/redirect`.

## Referências úteis

* Quickstart da Google para Node.js / Calendar API ([Google for Developers][5])
* Documentação do `@googleapis/calendar` ([npmjs.com][6])
* Exemplo real usando NestJS + Google Calendar ([GitHub][2])

---

### Sugestões e Boas Práticas

* **Armazenamento de tokens**: persista `access_token` + `refresh_token` para reutilização.
* **Escopo mínimo**: use somente os scopes realmente necessários.
* **Tratamento de erros**: valide tempo de expiração dos tokens e trate erros HTTP.
* **Validação de input**: use `class-validator`/DTOs no endpoint `/create`.

---

### Fontes
* https://www.reddit.com/r/Nestjs_framework/comments/108ju7b/hello_new_here_anybody_knows_what_should_i_use_to/?utm_source=chatgpt.com "Anybody knows what should i use to implement google calendars ..."
* https://github.com/tarcea/google-calendar-nestjs?utm_source=chatgpt.com "tarcea/google-calendar-nestjs - GitHub"
* https://googleapis.dev/nodejs/googleapis/latest/calendar/classes/Calendar.html?utm_source=chatgpt.com "calendar_v3.Calendar - googleapis documentation"
* https://joshuaakanetuk.com/blog/how-to-use-google-calendar/?utm_source=chatgpt.com "How To Use Google Calendar API with Node.js"
* https://developers.google.com/workspace/calendar/api/quickstart/nodejs?utm_source=chatgpt.com "Node.js quickstart | Google Calendar"
* https://www.npmjs.com/package/%40googleapis/calendar?utm_source=chatgpt.com "googleapis/calendar - NPM"
---