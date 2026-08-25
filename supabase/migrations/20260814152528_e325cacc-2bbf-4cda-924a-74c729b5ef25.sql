-- Clear KYC requests
DELETE FROM public.kyc_submissions;
DELETE FROM public.kyc_documents;

-- Clear customers and related tables (already partially done but ensuring everything is zeroed)
DELETE FROM public.customers;
DELETE FROM public.api_clients;
