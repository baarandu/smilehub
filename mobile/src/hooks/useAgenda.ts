import { useState, useEffect } from 'react';
import { appointmentsService } from '../services/appointments';
import { getPatients } from '../services/patients';
import { locationsService } from '../services/locations';
import type { AppointmentWithPatient, Patient } from '../types/database';
import type { Location } from '../services/locations';

export function useAgenda(selectedDate: Date, calendarMonth: Date) {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [datesWithAppointments, setDatesWithAppointments] = useState<string[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const refetchAppointments = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await appointmentsService.getByDate(dateStr);
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const refetchMonthDates = async () => {
    try {
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const dates = await appointmentsService.getDatesWithAppointments(startDate, endDate);
      setDatesWithAppointments(dates);
    } catch (error) {
      console.error('Error loading month dates:', error);
    }
  };

  const refetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const load = async () => {
      try {
        setLoading(true);
        const data = await appointmentsService.getByDate(dateStr);
        setAppointments(data);
      } catch (error) {
        console.error('Error loading appointments:', error);
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [selectedDate.toISOString().split('T')[0]]);

  useEffect(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const load = async () => {
      try {
        const dates = await appointmentsService.getDatesWithAppointments(startDate, endDate);
        setDatesWithAppointments(dates);
      } catch (error) {
        console.error('Error loading month dates:', error);
      }
    };
    
    load();
  }, [calendarMonth.getFullYear(), calendarMonth.getMonth()]);

  useEffect(() => {
    const load = async () => {
      try {
        const [patientsData, locationsData] = await Promise.all([
          getPatients(),
          locationsService.getAll(),
        ]);
        setPatients(patientsData);
        setLocations(locationsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    load();
  }, []);

  return {
    loading,
    appointments,
    datesWithAppointments,
    patients,
    locations,
    refetchAppointments,
    refetchMonthDates,
    refetchPatients,
  };
}

