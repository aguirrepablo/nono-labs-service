# Channel Schema Migration Guide

## Nueva propiedades agregadas

Se han agregado dos nuevas propiedades a la entidad `Channel`:

### 1. `defaultVirtualAgentId` (ObjectId, opcional)
- **Tipo**: Reference a VirtualAgent
- **Descripción**: Agente virtual asignado por defecto para el canal. Es el modelo que responderá a los mensajes en este canal.
- **Comportamiento**: Si está definido, se usa como agente por defecto. Si no, se busca automáticamente el primer agente activo del tenant.
- **Ejemplo de uso**:
  ```json
  {
    "name": "Mi Canal Telegram",
    "type": "telegram",
    "defaultVirtualAgentId": "507f1f77bcf86cd799439011"
  }
  ```

### 2. `maxContextMessages` (Number, default: 20)
- **Tipo**: Number entero
- **Rango**: 1 a 100
- **Descripción**: Cantidad máxima de mensajes anteriores que se enviarán como contexto al modelo de IA.
- **Default**: 20
- **Comportamiento**: Limita la ventana de contexto para reducir costos de tokens y mejorar el rendimiento.
- **Ejemplo de uso**:
  ```json
  {
    "name": "Mi Canal Telegram",
    "type": "telegram",
    "maxContextMessages": 10
  }
  ```

---

## Migración de Datos Existentes

### Ejecutar la migración

```bash
npm run migrate:add-channel-properties
```

Esta migración:
- ✅ Asigna `maxContextMessages: 20` a todos los canales existentes
- ✅ Deja `defaultVirtualAgentId` como indefinido (puede asignarse después)
- ✅ No afecta documentos que ya tengan estas propiedades

### Verificación

Después de ejecutar la migración, puedes verificar:

```javascript
// Ver un canal específico
db.channels.findOne({ _id: ObjectId("...") });

// Contar canales con maxContextMessages
db.channels.countDocuments({ maxContextMessages: { $exists: true } });

// Contar canales sin defaultVirtualAgentId
db.channels.countDocuments({ defaultVirtualAgentId: { $exists: false } });
```

---

## Uso en DTOs

### CreateChannelDto
```typescript
{
  type: "telegram",
  name: "Mi Canal",
  config: { /* ... */ },
  defaultVirtualAgentId?: "507f1f77bcf86cd799439011",  // Opcional
  maxContextMessages?: 25  // Opcional, default: 20
}
```

### UpdateChannelDto
```typescript
{
  maxContextMessages?: 15,  // Actualizar límite de contexto
  defaultVirtualAgentId?: "507f1f77bcf86cd799439011"  // Cambiar agente
}
```

---

## Cómo se utiliza en la aplicación

### 1. Selección de agente virtual

En `conversation-orchestrator.service.ts:73-75`:
```typescript
const virtualAgentId =
  channel.defaultVirtualAgentId ||
  (await this.getDefaultVirtualAgentForChannel(tenantId, channelId));
```

Si está definido `defaultVirtualAgentId`, se usa. Si no, busca automáticamente.

### 2. Límite de contexto

En `conversation-orchestrator.service.ts:205`:
```typescript
contextLimit: channel.maxContextMessages || 20,
```

Se envía `maxContextMessages` como `contextLimit` al generar respuestas de IA.

---

## Validaciones

Los DTOs incluyen validaciones:

- **defaultVirtualAgentId**: Debe ser un ObjectId válido de MongoDB (si está presente)
- **maxContextMessages**:
  - Debe ser número
  - Mínimo: 1
  - Máximo: 100

---

## Notas importantes

⚠️ **Importante**: Si actualizas canales existentes vía API, asegúrate de proporcionar `defaultVirtualAgentId` si necesitas un agente específico, de lo contrario se usará el agente por defecto del tenant.

✅ Después de ejecutar la migración, todos los canales tendrán `maxContextMessages` = 20.

🔄 Puedes cambiar estas propiedades en cualquier momento vía el endpoint `PATCH /channels/:id`.
