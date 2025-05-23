import { getLastRouletteNumbers, getRouletteStats, getRouletteNumberSequences } from './supabase';

// Función para generar números aleatorios en un rango
export const generateRandomNumbers = (count: number, min = 0, max = 36) => {
  const numbers = [];
  for (let i = 0; i < count; i++) {
    numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return numbers;
};

// Función para generar predicciones básicas basadas en estadísticas recientes
export const generateStatPredictions = async (count = 5) => {
  const lastNumbers = await getLastRouletteNumbers(100);
  
  if (!lastNumbers.length) {
    return generateRandomNumbers(count);
  }
  
  // Contar las frecuencias de los números
  const freqMap = new Map<number, number>();
  
  lastNumbers.forEach(entry => {
    const num = entry.number;
    freqMap.set(num, (freqMap.get(num) || 0) + 1);
  });
  
  // Ordenar por frecuencia
  const sortedFreq = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1]);
  
  // Tomar los primeros 'count' números más frecuentes
  return sortedFreq.slice(0, count).map(entry => entry[0]);
};

// Predicciones basadas en "Tía Lu" (números desencadenantes)
export const generateTiaLuPredictions = async () => {
  const lastNumbers = await getLastRouletteNumbers(10);
  
  if (!lastNumbers.length) {
    return generateRandomNumbers(5);
  }
  
  // Último número que salió
  const lastNumber = lastNumbers[0].number;
  
  // Mapa de números desencadenantes a posibles siguientes números
  const triggerMap: Record<number, number[]> = {
    0: [3, 12, 26, 32, 35],
    1: [5, 9, 16, 20, 24],
    2: [4, 11, 17, 25, 31],
    3: [0, 6, 14, 26, 34],
    4: [2, 15, 19, 21, 33],
    5: [1, 8, 13, 23, 30],
    6: [3, 17, 24, 27, 34],
    7: [11, 18, 20, 29, 36],
    8: [5, 10, 19, 28, 31],
    9: [1, 14, 22, 27, 36],
    10: [8, 13, 25, 29, 35],
    11: [2, 7, 20, 30, 33],
    12: [0, 16, 23, 28, 35],
    13: [5, 10, 17, 24, 31],
    14: [3, 9, 18, 26, 32],
    15: [4, 19, 22, 29, 34],
    16: [1, 12, 23, 27, 30],
    17: [2, 6, 13, 24, 32],
    18: [7, 14, 22, 28, 36],
    19: [4, 8, 15, 21, 33],
    20: [1, 7, 11, 25, 34],
    21: [4, 19, 26, 30, 36],
    22: [9, 15, 18, 27, 31],
    23: [5, 12, 16, 32, 35],
    24: [1, 6, 13, 29, 33],
    25: [2, 10, 20, 28, 34],
    26: [0, 3, 14, 21, 35],
    27: [6, 9, 16, 22, 31],
    28: [10, 12, 18, 25, 36],
    29: [7, 10, 15, 24, 33],
    30: [5, 11, 16, 21, 32],
    31: [2, 8, 13, 22, 27],
    32: [0, 14, 17, 23, 30],
    33: [4, 11, 19, 24, 29],
    34: [3, 6, 15, 20, 25],
    35: [0, 10, 12, 23, 26],
    36: [7, 9, 18, 21, 28]
  };
  
  // Devolver los números asociados con el último
  return triggerMap[lastNumber] || generateRandomNumbers(5);
};

// Predicciones "Puxa Ultra"
export const generatePuxaUltraPredictions = async () => {
  const lastNumbers = await getLastRouletteNumbers(5);
  
  if (lastNumbers.length < 3) {
    return generateRandomNumbers(5);
  }
  
  // Análisis de patrones en los últimos 3 números
  const last3 = lastNumbers.slice(0, 3).map(entry => entry.number);
  
  // Sumar los últimos 3 números para determinar un patrón
  const sum = last3.reduce((acc, num) => acc + num, 0);
  
  // Dependiendo de la suma, generamos diferentes grupos
  if (sum <= 30) {
    return [1, 5, 9, 12, 14, 23, 27, 30];
  } else if (sum <= 60) {
    return [2, 8, 13, 17, 24, 28, 31, 36];
  } else if (sum <= 90) {
    return [3, 6, 11, 19, 22, 25, 32, 35];
  } else {
    return [0, 4, 7, 10, 15, 18, 20, 26, 29, 33, 34];
  }
};

// Generar grupos de números de diferentes tamaños
export const generateNumberGroups = async () => {
  const lastNumbers = await getLastRouletteNumbers(30);
  
  // Para generar grupos más inteligentes, usamos los últimos números
  // como semilla para nuestros algoritmos
  
  // Grupo de 20 números - Mezcla de aleatorios y números frecuentes
  const group20Set = new Set<number>();
  
  // Añadir 10 números frecuentes
  const freqMap = new Map<number, number>();
  lastNumbers.forEach(entry => {
    const num = entry.number;
    freqMap.set(num, (freqMap.get(num) || 0) + 1);
  });
  
  Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(entry => group20Set.add(entry[0]));
  
  // Añadir números aleatorios hasta completar 20
  while (group20Set.size < 20) {
    group20Set.add(Math.floor(Math.random() * 37));
  }
  
  const group20 = Array.from(group20Set);
  
  // CORRECCIÓN: Grupo de 12 números totalmente dinámico
  // Incluimos números frecuentes y números de la docena más probable
  const group12Set = new Set<number>();
  
  // Calculamos frecuencias por docenas y columnas
  let dozenFreq = [0, 0, 0]; // d1, d2, d3
  let colFreq = [0, 0, 0];   // c1, c2, c3
  
  lastNumbers.forEach(entry => {
    const num = entry.number;
    if (num >= 1 && num <= 12) dozenFreq[0]++;
    else if (num >= 13 && num <= 24) dozenFreq[1]++;
    else if (num >= 25 && num <= 36) dozenFreq[2]++;
    
    if (num !== 0) {
      if (num % 3 === 1) colFreq[0]++;
      else if (num % 3 === 2) colFreq[1]++;
      else colFreq[2]++;
    }
  });
  
  // Añadimos los 6 números más frecuentes (siempre diferentes en cada generación)
  Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .forEach(entry => group12Set.add(entry[0]));
  
  // Añadimos números de la docena más probable hasta completar 12
  const mostFreqDozen = dozenFreq.indexOf(Math.max(...dozenFreq));
  const dozenStart = mostFreqDozen * 12 + 1;
  const dozenEnd = dozenStart + 11;
  
  // Añadimos solo algunos números aleatorios de la docena más frecuente
  // para evitar que el grupo sea demasiado predecible
  const candidates = [];
  for (let i = dozenStart; i <= dozenEnd; i++) {
    if (!group12Set.has(i)) {
      candidates.push(i);
    }
  }
  
  // Mezclar los candidatos y tomar los necesarios para completar
  candidates.sort(() => Math.random() - 0.5);
  for (let i = 0; i < candidates.length && group12Set.size < 10; i++) {
    group12Set.add(candidates[i]);
  }
  
  // Si aún no tenemos 12 números, añadimos de la columna más frecuente
  if (group12Set.size < 12) {
    const mostFreqCol = colFreq.indexOf(Math.max(...colFreq));
    for (let i = 1; i <= 36 && group12Set.size < 12; i++) {
      if ((i - 1) % 3 === mostFreqCol && !group12Set.has(i)) {
        group12Set.add(i);
      }
    }
  }
  
  // Como último recurso, añadimos números aleatorios
  while (group12Set.size < 12) {
    const randNum = Math.floor(Math.random() * 36) + 1;
    group12Set.add(randNum);
  }
  
  const group12 = Array.from(group12Set);
  
  // Grupo de 8 números - Basado en los números pares/impares más frecuentes
  let evenCount = 0;
  let oddCount = 0;
  
  lastNumbers.forEach(entry => {
    const num = entry.number;
    if (num !== 0) {
      if (num % 2 === 0) evenCount++;
      else oddCount++;
    }
  });
  
  const group8 = [];
  // Elegir los 8 primeros números pares o impares según lo más frecuente
  if (evenCount > oddCount) {
    for (let i = 2; i <= 36 && group8.length < 8; i += 2) {
      group8.push(i);
    }
  } else {
    for (let i = 1; i <= 35 && group8.length < 8; i += 2) {
      group8.push(i);
    }
  }
  
  // Grupo de 6 números - Usar la columna más frecuente
  const mostFreqCol = colFreq.indexOf(Math.max(...colFreq));
  const group6 = [];
  
  for (let i = 1; i <= 36 && group6.length < 6; i++) {
    if ((i - 1) % 3 === mostFreqCol) {
      group6.push(i);
    }
  }
  
  // Grupo de 4 números - Números más calientes
  const group4 = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(entry => entry[0]);
  
  // Grupo de 15 números - Combinación inteligente de estrategias múltiples
  const group15Set = new Set<number>();
  
  // 1. Añadir los 5 números más frecuentes
  Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(entry => group15Set.add(entry[0]));
  
  // 2. Añadir números de la docena más frecuente (máximo 4)
  const mostFreqDozen15 = dozenFreq.indexOf(Math.max(...dozenFreq));
  const dozenStart15 = mostFreqDozen15 * 12 + 1;
  const dozenEnd15 = dozenStart15 + 11;
  
  let addedFromDozen = 0;
  for (let i = dozenStart15; i <= dozenEnd15 && addedFromDozen < 4; i++) {
    if (!group15Set.has(i)) {
      group15Set.add(i);
      addedFromDozen++;
    }
  }
  
  // 3. Añadir números de la columna más frecuente (máximo 3)
  const mostFreqCol15 = colFreq.indexOf(Math.max(...colFreq));
  let addedFromColumn = 0;
  for (let i = 1; i <= 36 && addedFromColumn < 3; i++) {
    if ((i - 1) % 3 === mostFreqCol15 && !group15Set.has(i)) {
      group15Set.add(i);
      addedFromColumn++;
    }
  }
  
  // 4. Añadir números aleatorios hasta completar 15
  while (group15Set.size < 15) {
    const randNum = Math.floor(Math.random() * 37); // 0-36
    group15Set.add(randNum);
  }
  
  const group15 = Array.from(group15Set);
  
  // Registrar en consola para depuración
  console.log(`=== GRUPOS GENERADOS DINÁMICAMENTE ===`);
  console.log(`Grupo 20: [${Array.from(group20).sort((a, b) => a - b).join(', ')}]`);
  console.log(`Grupo 15: [${Array.from(group15).sort((a, b) => a - b).join(', ')}]`);
  console.log(`Grupo 12: [${Array.from(group12).sort((a, b) => a - b).join(', ')}]`);
  console.log(`Última fecha de generación: ${new Date().toLocaleTimeString()}`);
  
  return {
    group20,
    group15,
    group12,
    group8,
    group6,
    group4
  };
};

// Función para verificar si un número ganó dentro de un grupo
export const checkWinningNumber = (number: number, groups: any) => {
  const results = {
    group20: groups.group20.includes(number),
    group15: groups.group15.includes(number),
    group12: groups.group12.includes(number),
    group8: groups.group8.includes(number),
    group6: groups.group6.includes(number),
    group4: groups.group4.includes(number)
  };
  
  // Determinar el resultado general (ganó en algún grupo)
  const isWinner = Object.values(results).some(value => value === true);
  
  return {
    isWinner,
    details: results
  };
};

// Generar grupos basados en análisis estadístico local
export const generateLocalStatisticalGroups = async (): Promise<Record<string, number[]>> => {
  const stats = await getRouletteStats();
  const sequences = await getRouletteNumberSequences(50);
  
  if (!stats || !sequences) {
    return {
      groupTerminals: [],
      groupParity: [],
      groupColumns: [],
      groupDozens: [],
      groupRecent: []
    };
  }
  
  // Hacemos copia profunda de los datos para evitar modificaciones no deseadas
  const statsClone = JSON.parse(JSON.stringify(stats));
  
  // Grupo basado en terminales calientes
  const terminalGroup = [];
  if (statsClone.terminals && statsClone.terminals.hot) {
    for (const terminal of statsClone.terminals.hot) {
      for (let i = 0; i <= 36; i++) {
        if (i % 10 === terminal) {
          terminalGroup.push(i);
        }
      }
    }
  }
  
  // Grupo basado en la tendencia de paridad
  const evenOddRatio = statsClone.oddVsEven.odd / (statsClone.oddVsEven.odd + statsClone.oddVsEven.even);
  const parityGroup = [];
  for (let i = 1; i <= 36; i++) {
    if (evenOddRatio > 0.52) { // Tendencia a impares
      if (i % 2 === 1) parityGroup.push(i);
    } else if (evenOddRatio < 0.48) { // Tendencia a pares
      if (i % 2 === 0) parityGroup.push(i);
    } else {
      // Sin tendencia clara, usar números calientes
      parityGroup.push(...statsClone.hotNumbers);
      break;
    }
  }
  
  // Grupo basado en columnas/docenas más frecuentes
  const columnGroup = [];
  const dozenGroup = [];
  
  // Determinar columna más frecuente
  const columnsValues = [statsClone.columns.c1, statsClone.columns.c2, statsClone.columns.c3];
  const mostFreqColumnIndex = columnsValues.indexOf(Math.max(...columnsValues));
  for (let i = 1; i <= 36; i++) {
    if ((i - 1) % 3 === mostFreqColumnIndex) {
      columnGroup.push(i);
    }
  }
  
  // Determinar docena más frecuente
  const dozensValues = [statsClone.dozens.d1, statsClone.dozens.d2, statsClone.dozens.d3];
  const mostFreqDozenIndex = dozensValues.indexOf(Math.max(...dozensValues));
  const dozenStart = mostFreqDozenIndex * 12 + 1;
  for (let i = 0; i < 12; i++) {
    dozenGroup.push(dozenStart + i);
  }
  
  // Grupo basado en números recientes (últimos 10 + hot numbers)
  // Creamos copia para evitar problemas de referencia
  const recentGroup = Array.from(new Set([...statsClone.lastNumbers.slice(0, 10), ...statsClone.hotNumbers])).slice(0, 12);
  
  return {
    groupTerminals: terminalGroup.slice(0, 12), // Basado en terminales (dígitos finales)
    groupParity: parityGroup.slice(0, 8),       // Basado en tendencia par/impar
    groupColumns: columnGroup.slice(0, 6),      // Basado en columna más frecuente
    groupDozens: dozenGroup.slice(0, 6),        // Basado en docena más frecuente
    groupRecent: recentGroup.slice(0, 6)        // Basado en números recientes
  };
};

// Generar grupos basados en IA
export const generateAIBasedGroups = async (): Promise<Record<string, number[]>> => {
  try {
    const recentNumbers = await getLastRouletteNumbers(30);
    if (!recentNumbers || recentNumbers.length < 5) {
      return {
        groupCycles: generateRandomNumbers(6),
        groupNeighbors: generateRandomNumbers(6),
        groupSection: generateRandomNumbers(6),
        groupAlternate: generateRandomNumbers(6),
        groupRecentAI: generateRandomNumbers(6),
        // Nuevos grupos
        groupSectors: ROULETTE_WHEEL_SECTORS.voisinsDeZero.slice(0, 8),
        groupVecinos: getRouletteNeighborsImproved(recentNumbers?.[0]?.number || 0, 3)
      };
    }
    
    const numbers = recentNumbers.map(n => n.number);
    
    // Grupo 1: Ciclos avanzados
    const cycleNumbers = [];
    const recentSum = numbers.slice(0, 5).reduce((sum, num) => sum + num, 0);
    const recentAvg = recentSum / 5;
    
    // Predicción basada en ciclos y repeticiones
    for (let i = 0; i < 36; i++) {
      if (i > 0 && i !== 0 && Math.abs(i - recentAvg) < 6) {
        cycleNumbers.push(i);
      }
    }
    
    // Grupo 2: Vecinos en la rueda física
    const neighborNumbers = [];
    const lastNumber = numbers[0];
    // Obtener vecinos directos del último número jugado con radio 2
    const lastNeighbors = getRouletteNeighborsImproved(lastNumber, 2);
    neighborNumbers.push(...lastNeighbors);
    
    // Grupo 3: Sector caliente basado en los últimos números
    // Identificar qué sector contiene más de los últimos números jugados
    const sectorCounts = {
      voisinsZero: 0,
      tiers: 0, 
      orphelins: 0,
      jeuZero: 0
    };
    
    // Contar cuántos de los últimos 10 números están en cada sector
    numbers.slice(0, 10).forEach(num => {
      if (ROULETTE_WHEEL_SECTORS.voisinsDeZero.includes(num)) sectorCounts.voisinsZero++;
      if (ROULETTE_WHEEL_SECTORS.tiers.includes(num)) sectorCounts.tiers++;
      if (ROULETTE_WHEEL_SECTORS.orphelinsPlein.includes(num)) sectorCounts.orphelins++;
      if (ROULETTE_WHEEL_SECTORS.jeuZero.includes(num)) sectorCounts.jeuZero++;
    });
    
    // Seleccionar el sector con más ocurrencias
    let hotSector = 'voisinsZero';
    let maxCount = sectorCounts.voisinsZero;
    
    if (sectorCounts.tiers > maxCount) {
      hotSector = 'tiers';
      maxCount = sectorCounts.tiers;
    }
    if (sectorCounts.orphelins > maxCount) {
      hotSector = 'orphelins';
      maxCount = sectorCounts.orphelins;
    }
    if (sectorCounts.jeuZero > maxCount) {
      hotSector = 'jeuZero';
      maxCount = sectorCounts.jeuZero;
    }
    
    // Obtener números del sector caliente
    let sectionNumbers = [];
    if (hotSector === 'voisinsZero') sectionNumbers = ROULETTE_WHEEL_SECTORS.voisinsDeZero.slice(0, 8);
    else if (hotSector === 'tiers') sectionNumbers = ROULETTE_WHEEL_SECTORS.tiers.slice(0, 8);
    else if (hotSector === 'orphelins') sectionNumbers = ROULETTE_WHEEL_SECTORS.orphelinsPlein;
    else sectionNumbers = ROULETTE_WHEEL_SECTORS.jeuZero;
    
    // Grupo 4: Patrón de alternancia detectado
    // Detectar patrones como saltos entre columnas, filas o paridad
    const alternateNumbers = [];
    let hasAlternatingPattern = false;
    
    // Verificar si hay alternancia de paridad en los últimos 4 números
    const parities = numbers.slice(0, 4).map(n => n % 2);
    if (
      (parities[0] === 0 && parities[1] === 1 && parities[2] === 0 && parities[3] === 1) ||
      (parities[0] === 1 && parities[1] === 0 && parities[2] === 1 && parities[3] === 0)
    ) {
      hasAlternatingPattern = true;
      // Si existe alternancia, predecir continuando el patrón
      const nextParity = parities[0] === 0 ? 1 : 0;
      for (let i = 1; i <= 36; i++) {
        if (i % 2 === nextParity) alternateNumbers.push(i);
      }
    }
    
    if (!hasAlternatingPattern) {
      // Si no hay patrón claro, usar otros métodos
      alternateNumbers.push(...generateRandomNumbers(6));
    }
    
    // Grupo 5: Correlación con IA simulada
    const recentAI = await simulateAIPrediction(numbers.slice(0, 10));
    
    // Limitamos cada grupo a 8 números
    return {
      groupCycles: cycleNumbers.slice(0, 8),
      groupNeighbors: [...new Set(neighborNumbers)].slice(0, 8),
      groupSection: sectionNumbers.slice(0, 8),
      groupAlternate: alternateNumbers.slice(0, 8),
      groupRecentAI: recentAI.slice(0, 8),
      // Nuevos grupos
      groupSectors: ROULETTE_WHEEL_SECTORS.voisinsDeZero.slice(0, 8),
      groupVecinos: getRouletteNeighborsImproved(lastNumber, 3).slice(0, 8)
    };
  } catch (error) {
    console.error('Error in generateAIBasedGroups:', error);
    return {
      groupCycles: generateRandomNumbers(6),
      groupNeighbors: generateRandomNumbers(6),
      groupSection: generateRandomNumbers(6),
      groupAlternate: generateRandomNumbers(6),
      groupRecentAI: generateRandomNumbers(6),
      // Valores por defecto para los nuevos grupos
      groupSectors: ROULETTE_WHEEL_SECTORS.voisinsDeZero.slice(0, 8),
      groupVecinos: getRouletteNeighborsImproved(0, 3).slice(0, 8)
    };
  }
};

// Obtener vecinos de un número en la rueda de ruleta
function getRouletteNeighbors(number: number): number[] {
  // Disposición de números en la ruleta europea (0, 32, 15, 19, ...)
  const rouletteOrder = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  
  const index = rouletteOrder.indexOf(number);
  if (index === -1) return [];
  
  // Obtener 2 vecinos en cada dirección
  const neighbors = [];
  for (let i = 1; i <= 2; i++) {
    const leftIndex = (index - i + rouletteOrder.length) % rouletteOrder.length;
    const rightIndex = (index + i) % rouletteOrder.length;
    neighbors.push(rouletteOrder[leftIndex], rouletteOrder[rightIndex]);
  }
  
  return neighbors;
}

// Obtener los vecinos de un número en la ruleta (versión mejorada)
export const getRouletteNeighborsImproved = (number: number, radius = 2) => {
  // Orden de los números en la ruleta europea (0, 32, 15, 19, etc.)
  const wheelOrder = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
    6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
    29, 7, 28, 12, 35, 3, 26
  ];
  
  const position = wheelOrder.indexOf(number);
  if (position === -1) return [];
  
  const neighbors = [];
  const totalNumbers = wheelOrder.length;
  
  // Obtener vecinos en ambas direcciones
  for (let i = -radius; i <= radius; i++) {
    if (i === 0) continue; // Saltar el número mismo
    
    // Cálculo de posición con manejo de desbordamiento circular
    const neighborPos = (position + i + totalNumbers) % totalNumbers;
    neighbors.push(wheelOrder[neighborPos]);
  }
  
  return neighbors;
};

// Analizar secciones de la ruleta
function analyzeRouletteSection(numbers: number[]): { section: string, numbers: number[] } {
  // Dividir la ruleta en 3 secciones
  const section1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // 1-12
  const section2 = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]; // 13-24
  const section3 = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]; // 25-36
  
  // Contar ocurrencias en cada sección
  let count1 = 0, count2 = 0, count3 = 0;
  
  numbers.forEach(num => {
    if (section1.includes(num)) count1++;
    else if (section2.includes(num)) count2++;
    else if (section3.includes(num)) count3++;
  });
  
  // Determinar sección más frecuente
  if (count1 >= count2 && count1 >= count3) {
    return { section: 'section1', numbers: section1 };
  } else if (count2 >= count1 && count2 >= count3) {
    return { section: 'section2', numbers: section2 };
  } else {
    return { section: 'section3', numbers: section3 };
  }
}

// Detectar patrones de alternancia
function detectAlternatePatterns(sequence: string[]): string | null {
  if (sequence.length < 4) return null;
  
  const lastFour = sequence.slice(-4);
  
  // Verificar patrón par-impar-par-impar o similar
  if (lastFour[0] === 'even' && lastFour[1] === 'odd' && lastFour[2] === 'even' && lastFour[3] === 'odd') {
    return 'even'; // El siguiente sería par
  } else if (lastFour[0] === 'odd' && lastFour[1] === 'even' && lastFour[2] === 'odd' && lastFour[3] === 'even') {
    return 'odd'; // El siguiente sería impar
  }
  
  // Verificar patrón rojo-negro-rojo-negro o similar
  if (lastFour[0] === 'red' && lastFour[1] === 'black' && lastFour[2] === 'red' && lastFour[3] === 'black') {
    return 'red'; // El siguiente sería rojo
  } else if (lastFour[0] === 'black' && lastFour[1] === 'red' && lastFour[2] === 'black' && lastFour[3] === 'red') {
    return 'black'; // El siguiente sería negro
  }
  
  return null; // No se detectó patrón
}

// Simular correlación entre números (para el grupo basado en IA)
function getCorrelatedNumbers(numbers: number[]): number[] {
  const correlated = [];
  
  for (const num of numbers) {
    // "Correlación" simple: sumar/restar dígitos
    const digits = num.toString().split('').map(Number);
    if (digits.length === 2) {
      const sum = digits[0] + digits[1];
      const diff = Math.abs(digits[0] - digits[1]);
      
      if (sum <= 36) correlated.push(sum);
      if (diff > 0 && diff <= 36) correlated.push(diff);
      
      // También añadir "espejo" (ej: 23 -> 32)
      const mirror = parseInt(digits.reverse().join(''));
      if (mirror <= 36) correlated.push(mirror);
    } else {
      // Para 0-9, añadir múltiplos
      correlated.push((num * 2) % 37);
      correlated.push((num * 3) % 37);
    }
  }
  
  return correlated.filter(n => n > 0 && n <= 36);
}

// Función para simular predicción de IA basada en patrones de números
export const simulateAIPrediction = async (numbers: number[]): Promise<number[]> => {
  if (!numbers || numbers.length === 0) {
    return generateRandomNumbers(8);
  }
  
  try {
    // Conjunto para almacenar números únicos
    const predictedSet = new Set<number>();
    
    // 1. Usar correlación entre números
    const correlatedNumbers = getCorrelatedNumbers(numbers.slice(0, 8));
    correlatedNumbers.slice(0, 5).forEach(num => predictedSet.add(num));
    
    // 2. Buscar patrones de repetición en los últimos 20 números
    const lastFive = numbers.slice(0, 5);
    for (let i = 0; i < lastFive.length; i++) {
      // Añadir números cercanos al conjunto (+1, -1, +2, -2)
      const num = lastFive[i];
      if (num > 1) predictedSet.add(num - 1);
      if (num < 36) predictedSet.add(num + 1);
      if (num > 2) predictedSet.add(num - 2);
      if (num < 35) predictedSet.add(num + 2);
    }
    
    // 3. Usar vecinos físicos en la ruleta
    const lastNumber = numbers[0];
    const neighbors = getRouletteNeighborsImproved(lastNumber, 2);
    neighbors.forEach(num => predictedSet.add(num));
    
    // 4. Verificar docenas y columnas
    const groupDozenColumn = (num: number) => {
      // Calcular docena (1-12, 13-24, 25-36)
      const dozen = Math.ceil(num / 12);
      // Calcular columna (1,4,7... = 1; 2,5,8... = 2; 3,6,9... = 3)
      const column = ((num - 1) % 3) + 1;
      return { dozen, column };
    };
    
    // Contar frecuencias
    const dozenCounts = [0, 0, 0, 0]; // Índice 0 no se usa
    const columnCounts = [0, 0, 0, 0]; // Índice 0 no se usa
    
    numbers.slice(0, 10).forEach(num => {
      if (num === 0) return;
      const { dozen, column } = groupDozenColumn(num);
      dozenCounts[dozen]++;
      columnCounts[column]++;
    });
    
    // Encontrar docena y columna más frecuentes
    const maxDozen = dozenCounts.indexOf(Math.max(...dozenCounts));
    const maxColumn = columnCounts.indexOf(Math.max(...columnCounts));
    
    // Añadir algunos números de la docena y columna más frecuentes
    for (let i = 1; i <= 36; i++) {
      const { dozen, column } = groupDozenColumn(i);
      if (dozen === maxDozen || column === maxColumn) {
        // Solo añadir algunos para no sobrecargar
        if (Math.random() < 0.3) predictedSet.add(i);
      }
    }
    
    // Convertir a array y limitar a 8-12 números
    let predicted = Array.from(predictedSet);
    
    // Si tenemos pocos números, complementar con aleatorios
    if (predicted.length < 8) {
      const additional = generateRandomNumbers(8 - predicted.length);
      predicted = [...predicted, ...additional];
    }
    
    // Si tenemos demasiados, seleccionar aleatoriamente
    if (predicted.length > 12) {
      predicted = predicted.sort(() => Math.random() - 0.5).slice(0, 12);
    }
    
    return predicted;
  } catch (error) {
    console.error('Error en simulateAIPrediction:', error);
    return generateRandomNumbers(8);
  }
};

// Definición de sectores de la ruleta europea
export const ROULETTE_WHEEL_SECTORS = {
  // Sectores tradicionales
  tierDuZero: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15], // Tier du zero (Vecinos del cero)
  tierDuCylindre: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33], // Tier du cylindre
  orphelins: [1, 20, 14, 31, 9, 17, 34, 6], // Orphelins (Huérfanos)
  
  // Sectores populares
  jeuZero: [0, 3, 12, 15, 26, 32, 35], // Jeu Zero
  tiers: [33, 16, 24, 5, 10, 23, 8, 30, 11, 36, 13, 27], // Tiers
  voisinsDeZero: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15], // Voisins du Zéro
  orphelinsPlein: [1, 20, 14, 31, 9, 17, 34, 6], // Orphelins Plein
  
  // Otros sectores
  redSector: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
  blackSector: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
  greenSector: [0],
  
  // Sectores por posición en la rueda
  segment1: [0, 32, 15, 19, 4, 21, 2], // Segmento 1
  segment2: [25, 17, 34, 6, 27, 13, 36], // Segmento 2
  segment3: [11, 30, 8, 23, 10, 5, 24], // Segmento 3
  segment4: [16, 33, 1, 20, 14, 31, 9], // Segmento 4
  segment5: [22, 18, 29, 7, 28, 12, 35], // Segmento 5
  segment6: [3, 26, 0, 32, 15, 19, 4], // Segmento 6
};

// Obtener sectores específicos de la ruleta
export const getRouletteSectors = () => {
  return {
    voisinsDeZero: ROULETTE_WHEEL_SECTORS.voisinsDeZero,
    tiers: ROULETTE_WHEEL_SECTORS.tiers,
    orphelins: ROULETTE_WHEEL_SECTORS.orphelinsPlein,
    jeuZero: ROULETTE_WHEEL_SECTORS.jeuZero,
    segments: [
      ROULETTE_WHEEL_SECTORS.segment1,
      ROULETTE_WHEEL_SECTORS.segment2,
      ROULETTE_WHEEL_SECTORS.segment3,
      ROULETTE_WHEEL_SECTORS.segment4,
      ROULETTE_WHEEL_SECTORS.segment5
    ]
  };
}; 