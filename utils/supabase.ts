import { createClient } from '@supabase/supabase-js';
// Importación para Nuxt 3
import { useRuntimeConfig } from '#app';

// Caché en memoria para reducir consultas
let cachedNumbers: any[] = [];
let lastFetchTimestamp = 0;
const CACHE_LIFETIME = 10000; // 10 segundos de vida para la caché

// Configurar cliente de Supabase
const useSupabase = () => {
  // Para Nuxt 3 necesitamos importar useRuntimeConfig
  const { public: config } = useRuntimeConfig();
  const supabaseUrl = config.supabaseUrl;
  const supabaseKey = config.supabaseKey;
  
  return createClient(supabaseUrl, supabaseKey);
};

// Obtener los últimos números de la ruleta
export const getLastRouletteNumbers = async (limit = 20) => {
  // Verificar si podemos usar la caché
  const now = Date.now();
  if (cachedNumbers.length > 0 && (now - lastFetchTimestamp) < CACHE_LIFETIME) {
    return cachedNumbers.slice(0, limit);
  }
  
  const supabase = useSupabase();

  try {
    // Buscar los últimos números ordenados por fecha de creación (descendente)
    // Esto garantiza que el número más reciente siempre sea el primero en el resultado
    const { data, error } = await supabase
      .from('roulette_numbers_individual')
      .select('id, history_entry_id, number_value, color, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100)) // Limitar a máximo 100 para mejor rendimiento
      .range(0, Math.min(limit, 100) - 1);  // Asegurar que obtenemos exactamente los límites solicitados
    
    if (error) {
      console.error('Error fetching roulette numbers:', error);
      return cachedNumbers.length ? cachedNumbers.slice(0, limit) : [];
    }
    
    // Transformar los datos para mantener compatibilidad con el resto del código
    // Los datos ya vienen ordenados con el último jugado primero porque ordenamos por created_at desc
    const transformedData = data.map(item => ({
      id: item.id,
      history_entry_id: item.history_entry_id,
      number: item.number_value, // Mapear number_value a number para compatibilidad
      color: item.color,
      created_at: item.created_at,
      timestamp: item.created_at // Para compatibilidad con código existente
    }));
    
    // Actualizar la caché
    cachedNumbers = transformedData;
    lastFetchTimestamp = now;
    
    return transformedData;
  } catch (e) {
    console.error('Error inesperado al obtener números:', e);
    return cachedNumbers.length ? cachedNumbers.slice(0, limit) : [];
  }
};

// Insertar un nuevo número de ruleta
export const insertRouletteNumber = async (number: number, customTimestamp?: string) => {
  const supabase = useSupabase();
  
  // Validar que el número sea válido en la ruleta (0-36)
  if (number < 0 || number > 36 || isNaN(number)) {
    console.error(`Número inválido: ${number}. Debe estar entre 0 y 36.`);
    return null;
  }
  
  // Determinar el color del número
  let color = 'black';
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  
  if (number === 0) {
    color = 'green';
  } else if (redNumbers.includes(number)) {
    color = 'red';
  }
  
  // Intentar insertar hasta 3 veces como máximo en caso de error
  let attempts = 0;
  const maxAttempts = 3;
  let data = null;
  let lastError = null;
  
  while (attempts < maxAttempts && !data) {
    attempts++;
    try {
      // Primero, crear una entrada en la tabla roulette_history
      const historyResult = await supabase
        .from('roulette_history')
        .insert({
          numbers_string: number.toString()
        })
        .select();
      
      if (historyResult.error) {
        console.error('Error al insertar en roulette_history:', historyResult.error);
        throw historyResult.error;
      }
      
      if (!historyResult.data || historyResult.data.length === 0) {
        console.error('No se recibieron datos al insertar en roulette_history');
        throw new Error('No se pudo crear la entrada en roulette_history');
      }
      
      const historyEntryId = historyResult.data[0].id;
      console.log(`Entrada creada en roulette_history con ID: ${historyEntryId}`);
      
      // Ahora insertar en roulette_numbers_individual con la referencia a history
      const timestamp = customTimestamp || new Date().toISOString();
      const result = await supabase
        .from('roulette_numbers_individual')
        .insert({
          history_entry_id: historyEntryId,
          number_value: number,
          color,
          created_at: timestamp
        })
        .select();
      
      if (result.error) {
        console.error('Error al insertar en roulette_numbers_individual:', result.error);
        throw result.error;
      }
      
      if (!result.data || result.data.length === 0) {
        console.error('No se recibieron datos al insertar en roulette_numbers_individual');
        throw new Error('No se pudo crear la entrada en roulette_numbers_individual');
      }
      
      console.log(`Número ${number} insertado correctamente`);
      
      // Transformar los datos para mantener compatibilidad con el resto del código
      data = result.data.map(item => ({
        ...item,
        number: item.number_value // Agregar campo number para compatibilidad
      }));
      
      // Invalidar la caché para asegurar que los nuevos datos se carguen
      cachedNumbers = [];
      lastFetchTimestamp = 0;
      
    } catch (error: any) {
      lastError = error;
      console.error(`Error en intento ${attempts} al insertar número ${number}:`, error);
      
      // Si es un error de permisos o de conexión, no tiene sentido reintentar
      if (error.code === 'PGRST301' || error.message?.includes('permission') || 
          error.message?.includes('network') || error.message?.includes('connection')) {
        console.error('Error de permisos o conexión, no se reintentará');
        break;
      }
      
      // Esperar un breve tiempo antes de reintentar
      if (attempts < maxAttempts) {
        const delay = 300 * attempts; // Aumentar el tiempo de espera en cada intento
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  if (!data || !data[0]) {
    // Si después de todos los intentos no hay datos, intentar una inserción de emergencia solo en history
    try {
      console.error(`Realizando inserción de emergencia para número ${number}`);
      
      const emergencyResult = await supabase
        .from('roulette_history')
        .insert({
          numbers_string: `${number} (emergencia)`,
          notes: 'Inserción directa tras fallo en flujo normal'
        })
        .select();
      
      if (emergencyResult.data && emergencyResult.data.length > 0) {
        console.log('Inserción de emergencia exitosa');
        return {
          id: emergencyResult.data[0].id,
          number_value: number,
          number: number,
          color: color,
          created_at: new Date().toISOString()
        };
      }
    } catch (emergencyError) {
      console.error('Error en inserción de emergencia:', emergencyError);
    }
    
    console.error(`Error persistente al insertar número ${number}:`, lastError);
    return null;
  }
  
  return data[0];
};

// Función para verificar duplicados consecutivos de forma inteligente
const checkConsecutiveDuplicate = (number: number, recentNumbers: number[]) => {
  if (recentNumbers.length === 0) {
    return { isDuplicate: false, message: '' };
  }
  
  // Verificar si es el mismo número que el último (duplicado inmediato)
  if (recentNumbers[0] === number) {
    return {
      isDuplicate: true,
      message: `El número ${number} es idéntico al último número jugado. ¿Está seguro de que es correcto?`
    };
  }
  
  // Verificar si aparece 2 veces en los últimos 3 números (puede ser sospechoso)
  const last3 = recentNumbers.slice(0, 3);
  const appearances = last3.filter(n => n === number).length;
  
  if (appearances >= 2) {
    return {
      isDuplicate: true,
      message: `El número ${number} ya apareció ${appearances} veces en los últimos 3 números. ¿Desea continuar?`
    };
  }
  
  // No es duplicado problemático
  return { isDuplicate: false, message: '' };
};

// Función para procesar una entrada de texto con números separados por comas
export const processNumbersInput = async (numbersText: string) => {
  // Comprobar si la entrada es válida
  if (!numbersText || numbersText.trim() === '') {
    console.error('Entrada vacía');
    return null;
  }
  
  console.log(`Procesando entrada: "${numbersText}"`);
  
  // NUEVO: Obtener los últimos números para validar duplicados consecutivos
  const recentNumbers = await getLastRouletteNumbers(5); // Reducir a 5 números más recientes
  const recentNumberValues = recentNumbers.map(item => item.number);
  
  // Manejo especial para entrada de voz (solo un número)
  if (/^\d+$/.test(numbersText.trim())) {
    const singleNumber = parseInt(numbersText.trim());
    
    // Validar el número para ruleta
    if (singleNumber < 0 || singleNumber > 36 || isNaN(singleNumber)) {
      console.error(`Número inválido: ${singleNumber}. Debe estar entre 0 y 36.`);
      return null;
    }
    
    // MEJORADO: Verificar duplicados consecutivos más inteligentemente
    const isDuplicateConsecutive = checkConsecutiveDuplicate(singleNumber, recentNumberValues);
    if (isDuplicateConsecutive.isDuplicate) {
      console.error(`El número ${singleNumber} se detectó como duplicado consecutivo.`);
      return {
        error: true,
        message: isDuplicateConsecutive.message,
        isDuplicate: true,
        duplicateNumber: singleNumber,
        allowOverride: true // Permitir anular la validación si es necesario
      };
    }
    
    console.log(`Procesando número único del reconocimiento de voz: ${singleNumber}`);
    
    // Insertar el número directamente
    try {
      const result = await insertRouletteNumber(singleNumber);
      
      if (!result) {
        console.error(`No se pudo insertar el número ${singleNumber}`);
        return null;
      }
      
      // Invalidar la caché forzosamente
      cachedNumbers = [];
      lastFetchTimestamp = 0;
      
      console.log(`Número ${singleNumber} procesado correctamente`);
      
      return {
        processedCount: 1,
        totalInput: 1,
        numbers: [singleNumber],
        lastPlayed: singleNumber,
        individualEntries: [result],
      };
    } catch (error) {
      console.error(`Error al procesar número único ${singleNumber}:`, error);
      return null;
    }
  }
  
  // Para múltiples números, continuar con el procesamiento normal
  // Limpiar y normalizar la entrada
  let cleanedInput = numbersText.trim();
  
  // Detectar si hay espacios después de las comas y normalizar
  if (cleanedInput.includes(', ')) {
    cleanedInput = cleanedInput.replace(/, /g, ',');
  }
  
  // Reemplazar múltiples espacios con comas
  cleanedInput = cleanedInput.replace(/\s+/g, ',');
  
  // Procesar la entrada para extraer los números
  const numbersArray = cleanedInput
    .split(',')
    .map(n => n.trim())
    .filter(n => n.length > 0) // Eliminar elementos vacíos
    .map(n => {
      const parsed = parseInt(n);
      return parsed;
    })
    .filter(n => !isNaN(n) && n >= 0 && n <= 36); // Solo números válidos de ruleta (0-36)
  
  if (numbersArray.length === 0) {
    console.error('No se encontraron números válidos en la entrada');
    return null;
  }
  
  console.log(`Números extraídos: ${numbersArray.join(', ')}`);
  
  // MEJORADO: Verificar duplicados consecutivos para múltiples números
  const problematicNumbers = [];
  for (const num of numbersArray) {
    const duplicateCheck = checkConsecutiveDuplicate(num, recentNumberValues);
    if (duplicateCheck.isDuplicate) {
      problematicNumbers.push({ number: num, reason: duplicateCheck.message });
    }
  }
  
  if (problematicNumbers.length > 0) {
    const problemList = problematicNumbers.map(p => `${p.number} (${p.reason})`).join(', ');
    console.error(`Números con posibles duplicados: ${problemList}`);
    return {
      error: true,
      message: `Se detectaron posibles duplicados: ${problemList}. ¿Desea continuar de todos modos?`,
      isDuplicate: true,
      duplicateNumbers: problematicNumbers.map(p => p.number),
      allowOverride: true
    };
  }
  
  // IMPORTANTE: En la entrada, el número de la izquierda es el último jugado
  // Ejemplo: "19,20,12,11" - El 19 es el último número jugado, debe ser procesado ÚLTIMO para que aparezca como más reciente
  // Invertimos el orden para procesarlos correctamente (el más reciente se inserta al final)
  const processOrder = [...numbersArray].reverse(); // Invertir para procesar el más reciente al final
  
  // Insertar números en bloques más pequeños para evitar sobrecarga
  const validResults = [];
  const batchSize = 3; // Reducir el tamaño del lote para evitar sobrecarga
  
  for (let i = 0; i < processOrder.length; i += batchSize) {
    const batch = processOrder.slice(i, i + batchSize);
    
    try {
      // Insertar cada número individualmente manteniendo el orden temporal correcto
      const promises = batch.map(async (number, index) => {
        console.log(`Insertando número ${number} del lote ${Math.floor(i/batchSize) + 1}`);
        
        // Calcular timestamp: los números más antiguos tienen timestamps más antiguos
        const baseTime = new Date();
        const totalPosition = i + index;
        // Restamos segundos para que los números anteriores en la secuencia tengan timestamps más antiguos
        const adjustedTime = new Date(baseTime.getTime() - (processOrder.length - totalPosition - 1) * 1000);
        
        // Añadir un retraso para evitar sobrecarga del servidor
        await new Promise(resolve => setTimeout(resolve, index * 100));
        return insertRouletteNumber(number, adjustedTime.toISOString());
      });
      
      const results = await Promise.all(promises);
      const batchResults = results.filter(r => r !== null);
      validResults.push(...batchResults);
      
      console.log(`Lote ${Math.floor(i/batchSize) + 1} procesado: ${batchResults.length} números insertados`);
      
      // Esperar un momento entre lotes (reducido)
      if (i + batchSize < processOrder.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`Error procesando lote ${Math.floor(i/batchSize) + 1}:`, error);
    }
  }
  
  // El último número jugado es el primero en la lista original (izquierda)
  const lastPlayed = numbersArray[0];
  
  // Invalidar la caché forzosamente
  cachedNumbers = [];
  lastFetchTimestamp = 0;
  
  console.log(`Procesamiento completado: ${validResults.length}/${processOrder.length} números procesados`);
  
  // Retornar la información de los números procesados
  return {
    processedCount: validResults.length,
    totalInput: processOrder.length,
    numbers: validResults.map(r => r.number_value || r.number), // Asegurarse de obtener el número correcto
    lastPlayed: lastPlayed, // El primer número en la entrada (más a la izquierda)
    individualEntries: validResults,
  };
};

// Obtener estadísticas de los números
export const getRouletteStats = async () => {
  const supabase = useSupabase();
  
  // Obtener todos los números para calcular estadísticas
  const { data, error } = await supabase
    .from('roulette_numbers_individual')
    .select('id, history_entry_id, number_value, color, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  
  if (error) {
    console.error('Error fetching data for stats:', error);
    return null;
  }
  
  // Transformar datos para mantener compatibilidad
  const transformedData = data.map(item => ({
    id: item.id,
    number: item.number_value,
    color: item.color,
    created_at: item.created_at,
    timestamp: item.created_at
  }));
  
  // Calcular estadísticas
  const numberCounts = new Map<number, number>();
  let redCount = 0;
  let blackCount = 0;
  let oddCount = 0;
  let evenCount = 0;
  const columns = { c1: 0, c2: 0, c3: 0 };
  const dozens = { d1: 0, d2: 0, d3: 0 };
  
  // Los últimos números - IMPORTANTE: mantener el orden con el más reciente primero
  // Esto asegura que el último jugado aparezca a la izquierda en la visualización
  const lastNumbers = transformedData.slice(0, 20).map(item => item.number);
  
  // Analizar terminales (último dígito)
  const terminals = Array(10).fill(0);
  
  transformedData.forEach(item => {
    const num = item.number;
    
    // Conteo de números
    numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
    
    // Rojo vs Negro
    if (item.color === 'red') redCount++;
    else if (item.color === 'black') blackCount++;
    
    // Par vs Impar
    if (num !== 0) {
      if (num % 2 === 0) evenCount++;
      else oddCount++;
    }
    
    // Columnas
    if (num !== 0) {
      if (num % 3 === 1) columns.c1++;
      else if (num % 3 === 2) columns.c2++;
      else columns.c3++;
    }
    
    // Docenas
    if (num >= 1 && num <= 12) dozens.d1++;
    else if (num >= 13 && num <= 24) dozens.d2++;
    else if (num >= 25 && num <= 36) dozens.d3++;
    
    // Terminal (último dígito)
    const terminal = num % 10;
    terminals[terminal]++;
  });
  
  // Obtener los números más y menos frecuentes
  const sortedNumbers = Array.from(numberCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const hotNumbers = sortedNumbers.slice(0, 5).map(entry => entry[0]);
  const coldNumbers = sortedNumbers.slice(-5).map(entry => entry[0]);
  
  // Encontrar terminales más frecuentes
  const terminalsSorted = terminals.map((count, digit) => ({ digit, count }))
                                  .sort((a, b) => b.count - a.count);
  const hotTerminals = terminalsSorted.slice(0, 3).map(t => t.digit);
  
  return {
    hotNumbers,
    coldNumbers,
    redVsBlack: { red: redCount, black: blackCount },
    oddVsEven: { odd: oddCount, even: evenCount },
    columns,
    dozens,
    lastNumbers,
    terminals: {
      counts: terminals,
      hot: hotTerminals
    }
  };
};

// Nueva función para obtener secuencias de números desde la tabla individual
export const getRouletteNumberSequences = async (limit = 100) => {
  const supabase = useSupabase();
  
  // Obtener los últimos números
  const { data, error } = await supabase
    .from('roulette_numbers_individual')
    .select('id, history_entry_id, number_value, color, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching roulette sequences:', error);
    return null;
  }
  
  // Transformar datos para mantener compatibilidad
  const transformedData = data.map(item => ({
    id: item.id,
    number: item.number_value,
    color: item.color,
    created_at: item.created_at,
    timestamp: item.created_at
  }));
  
  // Usamos dos conjuntos de datos:
  // 1. Orden original (más reciente primero) para mostrar en la interfaz
  // 2. Orden cronológico para análisis de secuencias
  const originalOrder = [...transformedData]; // El más reciente primero (para mostrar)
  const chronologicalOrder = [...transformedData].reverse(); // De más antiguo a más reciente (para análisis)
  
  // Definir tipo para los ciclos
  interface RouletteCycle {
    numbers: number[];
    sum: number;
    colors: string[];
  }
  
  // Analizar las secuencias
  const sequences = {
    // Para mostrar en la interfaz (más reciente primero - izquierda)
    recentNumberSequence: originalOrder.slice(0, 10).map(item => item.number),
    
    // Para análisis (orden cronológico)
    numberSequences: chronologicalOrder.map(item => item.number),
    colorSequences: chronologicalOrder.map(item => item.color),
    paritySequences: chronologicalOrder.map(item => item.number !== 0 ? (item.number % 2 === 0 ? 'even' : 'odd') : 'zero'),
    dozenSequences: chronologicalOrder.map(item => {
      if (item.number === 0) return 'zero';
      if (item.number <= 12) return 'd1';
      if (item.number <= 24) return 'd2';
      return 'd3';
    }),
    columnSequences: chronologicalOrder.map(item => {
      if (item.number === 0) return 'zero';
      if (item.number % 3 === 1) return 'c1';
      if (item.number % 3 === 2) return 'c2';
      return 'c3';
    }),
    // Agrupar por "ciclos" (cada 5 números)
    cycles: [] as RouletteCycle[]
  };
  
  // Crear ciclos de 5 números
  for (let i = 0; i < sequences.numberSequences.length; i += 5) {
    if (i + 5 <= sequences.numberSequences.length) {
      sequences.cycles.push({
        numbers: sequences.numberSequences.slice(i, i + 5),
        sum: sequences.numberSequences.slice(i, i + 5).reduce((sum, num) => sum + num, 0),
        colors: sequences.colorSequences.slice(i, i + 5)
      });
    }
  }
  
  return sequences;
};

// ============================================================================
// FUNCIONES DE PURGA DE BASE DE DATOS
// ============================================================================

// Obtener estado actual de la base de datos
export const obtenerEstadoBaseDatos = async () => {
  try {
    const apiBaseUrl = process.server ? '' : window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin;
    
    const response = await fetch(`${apiBaseUrl}/estado-db`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener estado de la base de datos:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido'
    };
  }
};

// Ejecutar purga manual de la base de datos
export const ejecutarPurgaManual = async (mantenerHoras = 48, mantenerMinimo = 50) => {
  try {
    const apiBaseUrl = process.server ? '' : window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin;
    
    const response = await fetch(`${apiBaseUrl}/purgar-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mantener_horas: mantenerHoras,
        mantener_minimo: mantenerMinimo
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al ejecutar purga manual:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido'
    };
  }
};

// Verificar si la base de datos necesita purga
export const verificarNecesidadPurga = async () => {
  try {
    const estado = await obtenerEstadoBaseDatos();
    
    if (!estado.success) {
      return {
        necesita: false,
        error: estado.error
      };
    }
    
    const { estado: estadoDb } = estado;
    
    return {
      necesita: estadoDb.necesita_purga,
      horasDesdeAntiguo: estadoDb.horas_desde_mas_antiguo,
      totalRegistros: estadoDb.total_registros,
      registrosRecientes: {
        ultimas24h: estadoDb.registros_ultimas_24h,
        ultimas48h: estadoDb.registros_ultimas_48h
      },
      fechaAntigua: estadoDb.registro_mas_antiguo,
      fechaReciente: estadoDb.registro_mas_reciente
    };
  } catch (error) {
    console.error('Error al verificar necesidad de purga:', error);
    return {
      necesita: false,
      error: error.message || 'Error desconocido'
    };
  }
};

// Función para mostrar información legible sobre el estado de la DB
export const formatearEstadoDb = (estadoRaw: any) => {
  if (!estadoRaw || !estadoRaw.success) {
    return {
      mensaje: 'Error al obtener estado de la base de datos',
      detalles: estadoRaw?.error || 'Error desconocido'
    };
  }
  
  const estado = estadoRaw.estado;
  
  // Formatear fechas
  const formatearFecha = (isoString: string) => {
    try {
      const fecha = new Date(isoString);
      return fecha.toLocaleString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };
  
  // Determinar el estado general
  let estadoGeneral = '';
  let color = '';
  
  if (estado.necesita_purga) {
    estadoGeneral = '⚠️ Necesita purga';
    color = 'text-orange-600';
  } else if (estado.horas_desde_mas_antiguo > 36) {
    estadoGeneral = '⏳ Próxima purga pronto';
    color = 'text-yellow-600';
  } else {
    estadoGeneral = '✅ Estado normal';
    color = 'text-green-600';
  }
  
  return {
    estadoGeneral,
    color,
    totalRegistros: {
      individual: estado.total_registros.individual,
      history: estado.total_registros.history,
      total: estado.total_registros.individual + estado.total_registros.history
    },
    antiguedad: {
      horas: Math.round(estado.horas_desde_mas_antiguo * 100) / 100,
      fechaMasAntigua: estado.registro_mas_antiguo ? formatearFecha(estado.registro_mas_antiguo) : 'N/A',
      fechaMasReciente: estado.registro_mas_reciente ? formatearFecha(estado.registro_mas_reciente) : 'N/A'
    },
    registrosRecientes: {
      ultimas24h: estado.registros_ultimas_24h,
      ultimas48h: estado.registros_ultimas_48h,
      porcentaje24h: estado.total_registros.individual > 0 ? 
        Math.round((estado.registros_ultimas_24h / estado.total_registros.individual) * 100) : 0,
      porcentaje48h: estado.total_registros.individual > 0 ? 
        Math.round((estado.registros_ultimas_48h / estado.total_registros.individual) * 100) : 0
    },
    necesitaPurga: estado.necesita_purga,
    mensaje: `Base de datos con ${estado.total_registros.individual + estado.total_registros.history} registros. El más antiguo tiene ${Math.round(estado.horas_desde_mas_antiguo)} horas.`
  };
}; 