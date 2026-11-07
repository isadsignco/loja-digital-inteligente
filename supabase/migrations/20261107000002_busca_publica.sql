-- Permite que visitantes usem a busca do catálogo (filtro por search_vector).
-- A coluna contém apenas palavras do nome, descrição e palavras-chave de produtos ativos.
grant select (search_vector) on products to anon, authenticated;
