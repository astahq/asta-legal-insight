-- Create reports table for storing property analysis reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_address TEXT NOT NULL,
  property_url TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  scraped_data JSONB,
  analysis_result JSONB,
  on_watchlist BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auction_calendar table for manually managed auction entries
CREATE TABLE public.auction_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_house TEXT NOT NULL,
  open_lot TEXT NOT NULL,
  auction_date DATE NOT NULL,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_calendar ENABLE ROW LEVEL SECURITY;

-- For now, allow public read/write access (no auth yet)
-- These policies should be updated once authentication is implemented
CREATE POLICY "Allow public read access to reports"
ON public.reports FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to reports"
ON public.reports FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to reports"
ON public.reports FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access to reports"
ON public.reports FOR DELETE
USING (true);

CREATE POLICY "Allow public read access to auction_calendar"
ON public.auction_calendar FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to auction_calendar"
ON public.auction_calendar FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to auction_calendar"
ON public.auction_calendar FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access to auction_calendar"
ON public.auction_calendar FOR DELETE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auction_calendar_updated_at
BEFORE UPDATE ON public.auction_calendar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();